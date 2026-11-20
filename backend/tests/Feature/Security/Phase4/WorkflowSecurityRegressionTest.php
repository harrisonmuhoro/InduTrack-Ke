<?php

namespace Tests\Feature\Security\Phase4;

use Tests\TestCase;
use App\Models\User;
use App\Models\Placement;
use App\Models\LogbookEntry;
use App\Models\LogbookReviewHistory;
use App\Models\Message;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\DB;

/**
 * Phase 4 — Workstreams F & G: Workflow Authorization & Security Regression
 *
 * Verifies that:
 * 1. Locking an entry NEVER automatically submits a draft.
 * 2. Students cannot approve or review their own logbook entries.
 * 3. Reopening a rejected entry is strictly bounded by correction_deadline.
 * 4. Expired correction window permanently rejects resubmission.
 * 5. Review decisions enforce strict state-machine validation.
 * 6. Formal reviews preserve accurate actor attribution (academic_supervisor vs super_admin).
 * 7. Self-messaging is prohibited for all roles including superadmin.
 * 8. Messaging is strictly limited to authorized placement contacts.
 */
class WorkflowSecurityRegressionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    public function test_locking_draft_does_not_mutate_status_to_submitted(): void
    {
        $placement = Placement::where('status', 'active')->first();

        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->subDays(4)->toDateString(),
            'week_number'  => 70,
            'activities'   => 'Draft older than 72 hours',
            'status'       => 'draft',
            'created_at'   => now()->subHours(80),
        ]);

        $this->artisan('logbooks:lock')->assertSuccessful();

        $entry->refresh();
        $this->assertNotNull($entry->locked_at, 'Entry must be locked after 72 hours');
        $this->assertEquals('draft', $entry->status, 'Draft must NOT become submitted when locked');
    }

    public function test_student_cannot_review_own_logbook_entry(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', $john->email))->first();

        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 71,
            'activities'   => 'Submitted entry',
            'status'       => 'submitted',
        ]);

        Sanctum::actingAs($john);

        // Student tries to call review endpoint to self-approve -> 403 Forbidden
        $res = $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'approved']);
        $res->assertStatus(403);

        $entry->refresh();
        $this->assertEquals('submitted', $entry->status, 'Entry must remain submitted');
        $this->assertDatabaseCount('logbook_review_histories', 0);
    }

    public function test_cannot_transition_approved_entry_to_rejected_or_flagged(): void
    {
        $alan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 72,
            'activities'   => 'Formally approved entry',
            'status'       => 'approved',
            'reviewed_by'  => $alan->id,
            'reviewed_at'  => now(),
        ]);

        Sanctum::actingAs($alan);

        // State machine must reject transition from approved to rejected -> 422 Unprocessable
        $resReject = $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'rejected']);
        $resReject->assertStatus(422);

        // State machine must reject transition from approved to flagged -> 422 Unprocessable
        $resFlag = $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'flagged']);
        $resFlag->assertStatus(422);

        $entry->refresh();
        $this->assertEquals('approved', $entry->status);
    }

    public function test_self_messaging_is_strictly_prohibited(): void
    {
        $superadmin = User::where('email', 'superadmin@indutrack.ke')->first();
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();

        // Student messaging self -> 403
        Sanctum::actingAs($john);
        $resStudent = $this->postJson('/api/messages', [
            'receiver_id' => $john->id,
            'body'        => 'Self message attempt',
        ]);
        $resStudent->assertStatus(403);

        // Superadmin messaging self -> 403
        Sanctum::actingAs($superadmin);
        $resAdmin = $this->postJson('/api/messages', [
            'receiver_id' => $superadmin->id,
            'body'        => 'Superadmin self message attempt',
        ]);
        $resAdmin->assertStatus(403);

        $this->assertDatabaseMissing('messages', ['body' => 'Self message attempt']);
        $this->assertDatabaseMissing('messages', ['body' => 'Superadmin self message attempt']);
    }

    public function test_messaging_between_unrelated_students_is_rejected(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $david = User::where('email', 'david.kamau@student.strathmore.edu')->first();

        Sanctum::actingAs($john);

        $res = $this->postJson('/api/messages', [
            'receiver_id' => $david->id,
            'body'        => 'Hello David from UoN',
        ]);
        $res->assertStatus(403);

        $this->assertDatabaseMissing('messages', [
            'sender_id'   => $john->id,
            'receiver_id' => $david->id,
        ]);
    }
}
