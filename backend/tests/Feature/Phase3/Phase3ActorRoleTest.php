<?php

namespace Tests\Feature\Phase3;

use Tests\TestCase;
use App\Models\User;
use App\Models\Placement;
use App\Models\LogbookEntry;
use App\Models\LogbookReviewHistory;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\DB;

/**
 * Phase 3 Round 3 — Actor-role attribution and concurrency guard tests.
 *
 * Finding 1: reviewEntry() must derive actor_role from the authenticated user's
 *             actual role rather than hardcoding 'academic_supervisor'.
 *
 * Finding 3: The row-lock + state-machine guard must prevent double-approval even
 *             when two requests target the same entry. Because SQLite in-memory
 *             (used in the test suite) does not support true process-level
 *             parallelism, the concurrency scenario is validated by committing the
 *             first transaction and then verifying the state machine rejects a
 *             second identical request. This correctly proves the correctness of
 *             the guard. True process-level concurrency (simultaneous OS threads /
 *             processes) requires MySQL in a staging environment.
 */
class Phase3ActorRoleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    // ── Finding 1 ────────────────────────────────────────────────────────────

    /**
     * When an academic_supervisor reviews an entry, actor_role must be
     * 'academic_supervisor' in the history row.
     */
    public function test_academic_supervisor_review_records_correct_actor_role(): void
    {
        $alan      = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 50,
            'activities'   => 'Awaiting supervisor review',
            'status'       => 'submitted',
        ]);

        Sanctum::actingAs($alan);
        $res = $this->postJson("/api/logbooks/{$entry->id}/review", [
            'action'  => 'approved',
            'comment' => 'Good work.',
        ]);
        $res->assertStatus(200);

        $this->assertDatabaseHas('logbook_review_histories', [
            'logbook_entry_id' => $entry->id,
            'actor_id'         => $alan->id,
            'actor_role'       => 'academic_supervisor',
            'event_type'       => 'review',
            'new_status'       => 'approved',
        ]);
    }

    /**
     * When a super_admin reviews an entry, actor_role must be 'super_admin'
     * — not the incorrectly hardcoded 'academic_supervisor'.
     */
    public function test_super_admin_review_records_super_admin_actor_role(): void
    {
        $superAdmin = User::whereHas('roles', fn($q) => $q->where('name', 'super_admin'))->first();
        $this->assertNotNull($superAdmin, 'Seeder must create at least one super_admin user.');

        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 51,
            'activities'   => 'Awaiting super-admin review',
            'status'       => 'submitted',
        ]);

        Sanctum::actingAs($superAdmin);
        $res = $this->postJson("/api/logbooks/{$entry->id}/review", [
            'action'  => 'rejected',
            'comment' => 'Needs revision.',
        ]);
        $res->assertStatus(200);

        $this->assertDatabaseHas('logbook_review_histories', [
            'logbook_entry_id' => $entry->id,
            'actor_id'         => $superAdmin->id,
            'actor_role'       => 'super_admin',  // ← must NOT be 'academic_supervisor'
            'event_type'       => 'review',
            'new_status'       => 'rejected',
        ]);
    }

    // ── Finding 3 — Concurrency guard ────────────────────────────────────────

    /**
     * Row-lock + state-machine guard prevents double-approval.
     *
     * Scenario:
     *   1. Transaction A: approve the entry  → succeeds (200).
     *   2. Transaction B: reject same entry  → state machine rejects it (422)
     *      because 'approved' has no outbound transitions.
     *
     * Only one history row must exist and the final status must be 'approved'.
     *
     * Note: This validates the correctness of the state-machine guard using
     * sequential transactions (the only option with SQLite in-memory). True
     * simultaneous process-level concurrency requires MySQL in staging — the
     * lockForUpdate() call in reviewEntry() ensures the database-level exclusive
     * row lock is acquired before the state check, so the guard holds for
     * concurrent MySQL connections as well.
     */
    public function test_row_lock_and_state_machine_prevent_double_approval(): void
    {
        $alan      = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 52,
            'activities'   => 'Entry for concurrency guard test',
            'status'       => 'submitted',
        ]);

        Sanctum::actingAs($alan);

        // ── Transaction A: first request — must succeed ──────────────────
        $first = $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'approved']);
        $first->assertStatus(200);

        // ── Transaction B: duplicate/concurrent request — must be blocked ─
        // The state machine sees status='approved' which has no outbound transitions,
        // so it aborts with 422 before writing any row.
        $second = $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'rejected']);
        $second->assertStatus(422);

        // Final state reflects only the first decision
        $entry->refresh();
        $this->assertEquals('approved', $entry->status);
        $this->assertEquals(1, LogbookReviewHistory::where('logbook_entry_id', $entry->id)->count(),
            'Only one history row must exist — the duplicate request must have been blocked.');

        $this->assertDatabaseHas('logbook_review_histories', [
            'logbook_entry_id' => $entry->id,
            'previous_status'  => 'submitted',
            'new_status'       => 'approved',
            'actor_role'       => 'academic_supervisor',
            'event_type'       => 'review',
        ]);
    }

    /**
     * Verify that two sequential "approve" requests for the same submitted entry
     * only write one history row (idempotency guard via state machine).
     */
    public function test_duplicate_approve_request_does_not_create_second_history_row(): void
    {
        $alan      = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 53,
            'activities'   => 'Idempotency guard test',
            'status'       => 'submitted',
        ]);

        Sanctum::actingAs($alan);

        $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'approved'])->assertStatus(200);
        $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'approved'])->assertStatus(422);

        $this->assertEquals(1, LogbookReviewHistory::where('logbook_entry_id', $entry->id)->count());
    }
}
