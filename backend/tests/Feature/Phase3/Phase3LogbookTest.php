<?php

namespace Tests\Feature\Phase3;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Placement;
use App\Models\LogbookEntry;
use App\Models\Company;
use App\Models\Institution;
use App\Models\Role;
use App\Models\WeeklyLog;
use App\Models\FieldVisit;
use App\Models\Message;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\DB;

class Phase3LogbookTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    /**
     * Test 1: Student can create entry for their active placement.
     */
    public function test_student_can_create_logbook_entry_for_active_placement(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        Sanctum::actingAs($john);

        $response = $this->postJson('/api/logbooks', [
            'entry_date'      => now()->toDateString(),
            'week_number'     => 15,
            'activities'      => 'Worked on Phase 3 backend APIs and digital logbook workflow.',
            'lessons_learned' => 'Database constraints and race conditions.',
            'challenges'      => 'Resolving foreign key constraints.',
            'plan_next_week'  => 'Write test cases and verify frontend.',
            'status'          => 'draft',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('logbook_entries', [
            'week_number' => 15,
            'status'      => 'draft',
        ]);
    }

    /**
     * Test 2: Student cannot create duplicate entry for same week.
     */
    public function test_duplicate_week_entry_is_rejected(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        Sanctum::actingAs($john);

        $payload = [
            'entry_date'      => now()->toDateString(),
            'week_number'     => 16,
            'activities'      => 'Initial entry.',
        ];

        $this->postJson('/api/logbooks', $payload)->assertStatus(201);

        // Duplicate attempt must be rejected with 409 Conflict
        $response = $this->postJson('/api/logbooks', $payload);
        $response->assertStatus(409);
        $this->assertStringContainsString('already exists', $response->json('message'));
    }

    /**
     * Test 3: Student without active placement cannot create logbook entries.
     */
    public function test_student_without_active_placement_cannot_create_logbook(): void
    {
        $david = User::where('email', 'david.kamau@student.strathmore.edu')->first();
        Sanctum::actingAs($david);

        $response = $this->postJson('/api/logbooks', [
            'entry_date'  => now()->toDateString(),
            'week_number' => 1,
            'activities'  => 'Attempting to create entry without placement',
        ]);

        $response->assertStatus(422);
    }

    /**
     * Test 4: Student can edit entry within 72 hours.
     */
    public function test_student_can_edit_entry_within_72_hours(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        Sanctum::actingAs($john);

        $res = $this->postJson('/api/logbooks', [
            'entry_date'  => now()->toDateString(),
            'week_number' => 17,
            'activities'  => 'Original activities',
        ]);
        $entryId = $res->json('id');

        $updateRes = $this->putJson("/api/logbooks/{$entryId}", [
            'activities' => 'Updated activities within 72 hours',
        ]);

        $updateRes->assertStatus(200);
        $this->assertEquals('Updated activities within 72 hours', $updateRes->json('activities'));
    }

    /**
     * Test 5: Student cannot edit entry after 72 hours.
     */
    public function test_student_cannot_edit_entry_after_72_hours(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        // Create an entry dated 4 days ago
        $expiredEntry = LogbookEntry::create([
            'placement_id'    => $placement->id,
            'entry_date'      => now()->subDays(4)->toDateString(),
            'week_number'     => 18,
            'activities'      => 'Old activities',
            'created_at'      => now()->subHours(75),
            'updated_at'      => now()->subHours(75),
        ]);

        Sanctum::actingAs($john);
        $response = $this->putJson("/api/logbooks/{$expiredEntry->id}", [
            'activities' => 'Attempting late edit',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 6: Locked entry cannot be edited.
     */
    public function test_locked_entry_cannot_be_edited(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $lockedEntry = LogbookEntry::create([
            'placement_id'    => $placement->id,
            'entry_date'      => now()->toDateString(),
            'week_number'     => 19,
            'activities'      => 'Locked activities',
            'locked_at'       => now(),
            'lock_reason'     => 'Explicitly locked',
        ]);

        Sanctum::actingAs($john);
        $response = $this->putJson("/api/logbooks/{$lockedEntry->id}", [
            'activities' => 'Attempting to edit locked entry',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 7: Comments do not automatically approve entries.
     */
    public function test_supervisor_comment_does_not_auto_approve_entry(): void
    {
        $alan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $entry = LogbookEntry::create([
            'placement_id'    => $placement->id,
            'entry_date'      => now()->toDateString(),
            'week_number'     => 20,
            'activities'      => 'Reviewable activities',
            'status'          => 'submitted',
        ]);

        Sanctum::actingAs($alan);
        $res = $this->postJson("/api/logbooks/{$entry->id}/comments", [
            'comment' => 'Keep up the good work.',
        ]);

        $res->assertStatus(201);
        $entry->refresh();
        $this->assertEquals('submitted', $entry->status, 'Status must remain submitted after comment alone');
    }

    /**
     * Test 8: Explicit review changes status correctly.
     */
    public function test_supervisor_can_explicitly_review_entry(): void
    {
        $alan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $entry = LogbookEntry::create([
            'placement_id'    => $placement->id,
            'entry_date'      => now()->toDateString(),
            'week_number'     => 21,
            'activities'      => 'Pending review activities',
            'status'          => 'submitted',
        ]);

        Sanctum::actingAs($alan);
        $res = $this->postJson("/api/logbooks/{$entry->id}/review", [
            'action'  => 'approved',
            'comment' => 'Formally approved for academic credit.',
        ]);

        $res->assertStatus(200);
        $entry->refresh();
        $this->assertEquals('approved', $entry->status);
        $this->assertEquals($alan->id, $entry->reviewed_by);
        $this->assertNotNull($entry->reviewed_at);
    }

    /**
     * Test 9: Reviewing a draft or an already approved entry is rejected.
     */
    public function test_reviewing_invalid_entry_states_is_rejected(): void
    {
        $alan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        // 1. Cannot review draft entry
        $draftEntry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 22,
            'activities'   => 'Draft activities',
            'status'       => 'draft',
        ]);

        Sanctum::actingAs($alan);
        $resDraft = $this->postJson("/api/logbooks/{$draftEntry->id}/review", [
            'action' => 'approved',
        ]);
        $resDraft->assertStatus(422);

        // 2. Cannot alter already approved entry
        $approvedEntry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 23,
            'activities'   => 'Approved activities',
            'status'       => 'approved',
        ]);

        $resApproved = $this->postJson("/api/logbooks/{$approvedEntry->id}/review", [
            'action' => 'rejected',
        ]);
        $resApproved->assertStatus(422);
    }

    /**
     * Test 10: Student can formally submit a draft entry.
     */
    public function test_student_can_formally_submit_draft_entry(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 24,
            'activities'   => 'Ready for review',
            'status'       => 'draft',
        ]);

        Sanctum::actingAs($john);
        $res = $this->postJson("/api/logbooks/{$entry->id}/submit");
        $res->assertStatus(200);

        $entry->refresh();
        $this->assertEquals('submitted', $entry->status);
    }

    /**
     * Test 11: logbooks:lock command locks entries older than 72 hours.
     */
    public function test_logbooks_lock_artisan_command_locks_expired_entries(): void
    {
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $expiredEntry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->subDays(5)->toDateString(),
            'week_number'  => 25,
            'activities'   => 'Old entry',
            'status'       => 'draft',
            'created_at'   => now()->subHours(80),
        ]);

        $this->artisan('logbooks:lock')->assertSuccessful();

        $expiredEntry->refresh();
        $this->assertNotNull($expiredEntry->locked_at);
        $this->assertEquals('Automatically locked after 72 hours', $expiredEntry->lock_reason);
        $this->assertEquals('draft', $expiredEntry->status, 'Locking must not submit an unsubmitted draft.');
    }

    public function test_rejected_entry_can_be_reopened_and_each_decision_is_immutable(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $alan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', $john->email))->first();
        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date' => now()->toDateString(),
            'week_number' => 26,
            'activities' => 'Initial submission',
            'status' => 'submitted',
        ]);

        Sanctum::actingAs($alan);
        $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'rejected', 'comment' => 'Please correct this.'])
            ->assertStatus(200);
        $entry->refresh();
        $this->assertNotNull($entry->correction_deadline);

        Sanctum::actingAs($john);
        $this->postJson("/api/logbooks/{$entry->id}/resubmit")->assertStatus(200);
        $this->postJson("/api/logbooks/{$entry->id}/submit")->assertStatus(200);

        Sanctum::actingAs($alan);
        $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'approved'])->assertStatus(200);

        $this->assertDatabaseCount('logbook_review_histories', 3);
        $this->assertDatabaseHas('logbook_review_histories', ['previous_status' => 'submitted', 'new_status' => 'rejected']);
        $this->assertDatabaseHas('logbook_review_histories', ['previous_status' => 'rejected', 'new_status' => 'draft']);
        $this->assertDatabaseHas('logbook_review_histories', ['previous_status' => 'submitted', 'new_status' => 'approved']);
    }

    public function test_expired_rejected_entry_cannot_be_reopened(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', $john->email))->first();
        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date' => now()->toDateString(),
            'week_number' => 28,
            'activities' => 'Rejected old entry',
            'status' => 'rejected',
            'correction_deadline' => now()->subMinute(),
        ]);

        Sanctum::actingAs($john);
        $this->postJson("/api/logbooks/{$entry->id}/resubmit")->assertStatus(403);
    }

    public function test_company_supervisor_cannot_make_formal_academic_decision(): void
    {
        $companySupervisor = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();
        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date' => now()->toDateString(),
            'week_number' => 27,
            'activities' => 'Awaiting academic review',
            'status' => 'submitted',
        ]);

        Sanctum::actingAs($companySupervisor);
        $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'approved'])->assertStatus(403);
        $this->assertDatabaseCount('logbook_review_histories', 0);
    }

    /**
     * Finding 2 regression — rejected entry with an active correction_deadline
     * must NOT be prematurely locked by the scheduler based on created_at.
     */
    public function test_locking_service_respects_correction_deadline_not_created_at(): void
    {
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();
        $alan      = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $john      = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();

        // Entry created 5 days ago (would normally be locked by the standard 72h window)
        $entry = LogbookEntry::create([
            'placement_id'        => $placement->id,
            'entry_date'          => now()->subDays(5)->toDateString(),
            'week_number'         => 29,
            'activities'          => 'Old entry that was rejected',
            'status'              => 'submitted',
            'created_at'          => now()->subDays(5),
        ]);

        // Supervisor rejects it now — this sets a 72h correction_deadline from NOW
        Sanctum::actingAs($alan);
        $this->postJson("/api/logbooks/{$entry->id}/review", [
            'action'  => 'rejected',
            'comment' => 'Please revise this entry.',
        ])->assertStatus(200);

        $entry->refresh();
        $this->assertNotNull($entry->correction_deadline);
        $this->assertTrue($entry->correction_deadline->isFuture(), 'correction_deadline must be in the future');

        // Student reopens it
        Sanctum::actingAs($john);
        $this->postJson("/api/logbooks/{$entry->id}/resubmit")->assertStatus(200);
        $entry->refresh();
        $this->assertEquals('draft', $entry->status);

        // Run the locking scheduler — it must NOT lock this entry because
        // the correction_deadline (correction window) is still in the future
        $this->artisan('logbooks:lock')->assertSuccessful();

        $entry->refresh();
        $this->assertNull($entry->locked_at, 'Entry must not be locked while correction_deadline is still active');
    }

    /**
     * Finding 3 — full correction workflow:
     * reject → reopen → edit → resubmit → approve
     */
    public function test_full_rejection_correction_and_resubmission_workflow(): void
    {
        $john  = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $alan  = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', $john->email))->first();

        // 1. Create a draft and submit it
        Sanctum::actingAs($john);
        $createRes = $this->postJson('/api/logbooks', [
            'entry_date'  => now()->toDateString(),
            'week_number' => 30,
            'activities'  => 'Week 30 activities',
        ]);
        $createRes->assertStatus(201);
        $entryId = $createRes->json('id');

        $this->postJson("/api/logbooks/{$entryId}/submit")->assertStatus(200);

        // 2. Supervisor rejects after the original 72h window would have expired
        //    (simulate by back-dating created_at without touching correction_deadline)
        DB::table('logbook_entries')->where('id', $entryId)->update(['created_at' => now()->subDays(5)]);

        Sanctum::actingAs($alan);
        $rejectRes = $this->postJson("/api/logbooks/{$entryId}/review", [
            'action'  => 'rejected',
            'comment' => 'Week 30 needs more detail.',
        ]);
        $rejectRes->assertStatus(200);

        $entry = LogbookEntry::find($entryId);
        $this->assertEquals('rejected', $entry->status);
        $this->assertNotNull($entry->correction_deadline);
        $this->assertTrue($entry->correction_deadline->isFuture());

        // 3. Student reopens within correction window
        Sanctum::actingAs($john);
        $resubmitRes = $this->postJson("/api/logbooks/{$entryId}/resubmit");
        $resubmitRes->assertStatus(200);
        $entry->refresh();
        $this->assertEquals('draft', $entry->status);

        // 4. Student edits (correction_deadline still active so edit must be allowed)
        $editRes = $this->putJson("/api/logbooks/{$entryId}", [
            'activities' => 'Week 30 activities — revised with additional detail.',
        ]);
        $editRes->assertStatus(200);

        // 5. Student resubmits
        $this->postJson("/api/logbooks/{$entryId}/submit")->assertStatus(200);
        $entry->refresh();
        $this->assertEquals('submitted', $entry->status);

        // 6. Locking scheduler must not lock it (correction_deadline still active)
        $this->artisan('logbooks:lock')->assertSuccessful();
        $entry->refresh();
        $this->assertNull($entry->locked_at);

        // 7. Supervisor approves
        Sanctum::actingAs($alan);
        $approveRes = $this->postJson("/api/logbooks/{$entryId}/review", ['action' => 'approved']);
        $approveRes->assertStatus(200);
        $entry->refresh();
        $this->assertEquals('approved', $entry->status);

        // 8. Verify complete audit trail: reject, reopen, approve
        $this->assertDatabaseCount('logbook_review_histories', 3);
    }

    /**
     * Finding 3 — editing after correction deadline expires must be blocked.
     */
    public function test_editing_after_correction_deadline_is_blocked(): void
    {
        $john      = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', $john->email))->first();

        $entry = LogbookEntry::create([
            'placement_id'        => $placement->id,
            'entry_date'          => now()->subDays(5)->toDateString(),
            'week_number'         => 31,
            'activities'          => 'Entry past deadline',
            'status'              => 'draft',
            'created_at'          => now()->subDays(5),
            // correction_deadline expired 1 minute ago
            'correction_deadline' => now()->subMinute(),
        ]);

        Sanctum::actingAs($john);
        $editRes = $this->putJson("/api/logbooks/{$entry->id}", [
            'activities' => 'Attempting edit past correction deadline',
        ]);
        $editRes->assertStatus(403);
    }

    /**
     * Finding 4 — concurrency: only one of two sequential review attempts can
     * succeed for a submitted entry. The second must be rejected by the state machine.
     * (Sequential test proving the row-level locking state-machine guard works.)
     */
    public function test_sequential_concurrent_review_only_one_decision_persists(): void
    {
        $alan      = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 32,
            'activities'   => 'Entry for concurrency test',
            'status'       => 'submitted',
        ]);

        Sanctum::actingAs($alan);

        // First reviewer approves — must succeed
        $first = $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'approved']);
        $first->assertStatus(200);

        // Second reviewer (same user, simulating a duplicate/concurrent request) tries to reject
        // The state machine (allowedTransitions) must reject this — approved cannot transition to rejected
        $second = $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'rejected']);
        $second->assertStatus(422);

        // Final state must reflect only the first decision
        $entry->refresh();
        $this->assertEquals('approved', $entry->status);

        // Only one review history entry must exist
        $this->assertDatabaseCount('logbook_review_histories', 1);
        $this->assertDatabaseHas('logbook_review_histories', [
            'previous_status' => 'submitted',
            'new_status'      => 'approved',
            'actor_role'      => 'academic_supervisor',
            'event_type'      => 'review',
        ]);
    }

    public function test_super_admin_review_race_records_super_admin_actor_role(): void
    {
        $admin = User::where('email', 'superadmin@indutrack.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();
        $entry = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date' => now()->toDateString(),
            'week_number' => 34,
            'activities' => 'Super-admin concurrency guard test',
            'status' => 'submitted',
        ]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'approved'])->assertStatus(200);
        $this->postJson("/api/logbooks/{$entry->id}/review", ['action' => 'rejected'])->assertStatus(422);

        $this->assertDatabaseHas('logbook_review_histories', [
            'logbook_entry_id' => $entry->id,
            'actor_id' => $admin->id,
            'actor_role' => 'super_admin',
            'event_type' => 'review',
        ]);
        $this->assertDatabaseCount('logbook_review_histories', 1);
    }

    /**
     * Finding 5 — resubmit action is recorded as actor_role=student, event_type=resubmit.
     * reviewer_id must be null for student resubmission.
     */
    public function test_resubmit_audit_record_uses_actor_fields_not_reviewer_id(): void
    {
        $john      = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $alan      = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $placement = Placement::whereHas('student.user', fn($q) => $q->where('email', $john->email))->first();

        $entry = LogbookEntry::create([
            'placement_id'        => $placement->id,
            'entry_date'          => now()->toDateString(),
            'week_number'         => 33,
            'activities'          => 'Audit trail test',
            'status'              => 'rejected',
            'correction_deadline' => now()->addHours(72),
        ]);

        Sanctum::actingAs($john);
        $this->postJson("/api/logbooks/{$entry->id}/resubmit")->assertStatus(200);

        // The history row must carry actor fields identifying the student action.
        // reviewer_id must be null — this was NOT a formal academic review.
        $this->assertDatabaseHas('logbook_review_histories', [
            'logbook_entry_id' => $entry->id,
            'actor_id'         => $john->id,
            'actor_role'       => 'student',
            'event_type'       => 'resubmit',
            'reviewer_id'      => null,
        ]);
    }
}
