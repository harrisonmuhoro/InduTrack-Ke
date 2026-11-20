<?php

namespace Tests\Feature\Phase3;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Placement;
use App\Models\LogbookEntry;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Phase 3 Round 3 — Migration repair regression tests.
 *
 * Finding 2: The repair migration 2026_11_20_000008_repair_logbook_review_history_data
 * performs three backfill operations:
 *
 *   A. Rejected logbook_entries with no correction_deadline get
 *      correction_deadline = reviewed_at + 72h (or created_at + 72h fallback).
 *
 *   B. logbook_review_histories rows that represent student resubmit events
 *      (previous_status=rejected, new_status=draft, comment contains 'reopened')
 *      get actor_role='student', event_type='resubmit', reviewer_id=null.
 *
 *   C. Formal review history rows (new_status IN approved/rejected/flagged) with
 *      a reviewer_id but no actor_id get actor_id=reviewer_id,
 *      actor_role='academic_supervisor', event_type='review'.
 *
 *   D. Re-running the migration on already-repaired data must NOT corrupt it
 *      (idempotency).
 *
 * Strategy: seed representative "legacy" rows directly into the DB,
 * invoke the migration's up() method, then assert the expected state.
 */
class Phase3MigrationRepairTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    /**
     * Helper — create a bare logbook_entry directly in the DB
     * (bypassing model timestamps so we can set exact created_at).
     */
    private function rawEntry(array $attrs = []): int
    {
        $placement = Placement::whereHas('student.user',
            fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke')
        )->first();

        return DB::table('logbook_entries')->insertGetId(array_merge([
            'placement_id'        => $placement->id,
            'entry_date'          => now()->toDateString(),
            'week_number'         => rand(60, 90),
            'activities'          => 'Legacy entry for repair test',
            'status'              => 'rejected',
            'correction_deadline' => null,
            'reviewed_at'         => null,
            'created_at'          => now()->subDays(5)->toDateTimeString(),
            'updated_at'          => now()->subDays(5)->toDateTimeString(),
        ], $attrs));
    }

    /**
     * Helper — invoke the repair migration's up() method directly.
     */
    private function runRepairMigration(): void
    {
        $migration = require base_path(
            'database/migrations/2026_11_20_000008_repair_logbook_review_history_data.php'
        );
        $migration->up();
    }

    // ── Test A: rejected entry without correction_deadline, WITH reviewed_at ─

    /**
     * A rejected entry with reviewed_at but no correction_deadline should get
     * correction_deadline = reviewed_at + 72 hours.
     */
    public function test_repair_sets_correction_deadline_from_reviewed_at(): void
    {
        $reviewedAt = now()->subHours(10)->toDateTimeString();

        $entryId = $this->rawEntry([
            'status'              => 'rejected',
            'correction_deadline' => null,
            'reviewed_at'         => $reviewedAt,
        ]);

        $this->runRepairMigration();

        $row = DB::table('logbook_entries')->find($entryId);
        $this->assertNotNull($row->correction_deadline, 'correction_deadline must be backfilled.');

        $expected = Carbon::parse($reviewedAt)->addHours(72);
        $actual   = Carbon::parse($row->correction_deadline);
        $this->assertTrue(
            $actual->diffInSeconds($expected) < 2,
            "correction_deadline must equal reviewed_at + 72h. Got {$actual}, expected {$expected}."
        );
    }

    // ── Test B: rejected entry without correction_deadline AND without reviewed_at ─

    /**
     * A rejected entry with no reviewed_at and no correction_deadline should get
     * correction_deadline = created_at + 72 hours (safe fallback).
     */
    public function test_repair_uses_created_at_fallback_when_no_reviewed_at(): void
    {
        $createdAt = now()->subDays(3)->toDateTimeString();

        $entryId = $this->rawEntry([
            'status'              => 'rejected',
            'correction_deadline' => null,
            'reviewed_at'         => null,
            'created_at'          => $createdAt,
            'updated_at'          => $createdAt,
        ]);

        $this->runRepairMigration();

        $row = DB::table('logbook_entries')->find($entryId);
        $this->assertNotNull($row->correction_deadline, 'correction_deadline must be backfilled via created_at fallback.');

        $expected = Carbon::parse($createdAt)->addHours(72);
        $actual   = Carbon::parse($row->correction_deadline);
        $this->assertTrue(
            $actual->diffInSeconds($expected) < 2,
            "correction_deadline must equal created_at + 72h. Got {$actual}, expected {$expected}."
        );
    }

    // ── Test C: student resubmit event reclassification ──────────────────────

    /**
     * A history row representing a student reopen event (previous=rejected,
     * new=draft, comment contains 'reopened') must be reclassified with
     * actor_role='student', event_type='resubmit', reviewer_id=null.
     */
    public function test_repair_reclassifies_student_resubmit_history_rows(): void
    {
        $placement = Placement::whereHas('student.user',
            fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke')
        )->first();
        $student = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();

        $entryId = DB::table('logbook_entries')->insertGetId([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 61,
            'activities'   => 'Entry for resubmit reclassification test',
            'status'       => 'draft',
            'created_at'   => now()->toDateTimeString(),
            'updated_at'   => now()->toDateTimeString(),
        ]);

        // Legacy row: reviewer_id set to student (old schema used reviewer_id for all actors)
        $histId = DB::table('logbook_review_histories')->insertGetId([
            'logbook_entry_id' => $entryId,
            'reviewer_id'      => $student->id,  // old schema: reviewer_id used for student too
            'actor_id'         => null,
            'actor_role'       => null,
            'event_type'       => null,
            'previous_status'  => 'rejected',
            'new_status'       => 'draft',
            'comment'          => 'Student reopened the rejected entry for correction.',
            'reviewed_at'      => now()->toDateTimeString(),
            'created_at'       => now()->toDateTimeString(),
            'updated_at'       => now()->toDateTimeString(),
        ]);

        $this->runRepairMigration();

        $row = DB::table('logbook_review_histories')->find($histId);
        $this->assertEquals('student', $row->actor_role);
        $this->assertEquals('resubmit', $row->event_type);
        $this->assertNull($row->reviewer_id, 'reviewer_id must be null for student resubmit events.');
    }

    // ── Test D: formal review history reclassification ───────────────────────

    /**
     * A formal review history row (new_status=approved) with reviewer_id set
     * but no actor_id must get actor_id=reviewer_id, actor_role='academic_supervisor',
     * event_type='review'.
     */
    public function test_repair_backfills_actor_fields_for_formal_review_rows(): void
    {
        $placement  = Placement::whereHas('student.user',
            fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke')
        )->first();
        $supervisor = User::where('email', 'supervisor@uonbi.ac.ke')->first();

        $entryId = DB::table('logbook_entries')->insertGetId([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 62,
            'activities'   => 'Entry for actor backfill test',
            'status'       => 'approved',
            'created_at'   => now()->toDateTimeString(),
            'updated_at'   => now()->toDateTimeString(),
        ]);

        // Legacy row: only reviewer_id exists, actor fields are null
        $histId = DB::table('logbook_review_histories')->insertGetId([
            'logbook_entry_id' => $entryId,
            'reviewer_id'      => $supervisor->id,
            'actor_id'         => null,
            'actor_role'       => null,
            'event_type'       => null,
            'previous_status'  => 'submitted',
            'new_status'       => 'approved',
            'comment'          => 'Formally approved.',
            'reviewed_at'      => now()->toDateTimeString(),
            'created_at'       => now()->toDateTimeString(),
            'updated_at'       => now()->toDateTimeString(),
        ]);

        $this->runRepairMigration();

        $row = DB::table('logbook_review_histories')->find($histId);
        $this->assertEquals($supervisor->id, $row->actor_id);
        $this->assertEquals('academic_supervisor', $row->actor_role);
        $this->assertEquals('review', $row->event_type);
    }

    // ── Test E: idempotency ───────────────────────────────────────────────────

    /**
     * Re-running the repair migration on already-repaired data must NOT
     * corrupt existing correct values.
     */
    public function test_repair_migration_is_idempotent(): void
    {
        $reviewedAt = now()->subHours(5)->toDateTimeString();
        $expectedDeadline = Carbon::parse($reviewedAt)->addHours(72)->toDateTimeString();

        $entryId = $this->rawEntry([
            'status'              => 'rejected',
            'correction_deadline' => null,
            'reviewed_at'         => $reviewedAt,
        ]);

        // First run
        $this->runRepairMigration();

        $after1 = DB::table('logbook_entries')->find($entryId);
        $this->assertNotNull($after1->correction_deadline);

        // Second run — must not change already-repaired data
        $this->runRepairMigration();

        $after2 = DB::table('logbook_entries')->find($entryId);
        $this->assertEquals(
            $after1->correction_deadline,
            $after2->correction_deadline,
            'Re-running the migration must not alter already-correct correction_deadline values.'
        );
    }
}
