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
    }
}
