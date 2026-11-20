<?php

namespace Tests\Feature\Phase3;

use Tests\TestCase;
use App\Models\User;
use App\Models\Placement;
use App\Models\WeeklyLog;
use App\Models\FieldVisit;
use App\Models\StudentFlag;
use Laravel\Sanctum\Sanctum;

class Phase3SupervisionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    /**
     * Test 1: Assigned company supervisor can submit weekly performance log.
     */
    public function test_assigned_company_supervisor_can_submit_weekly_log(): void
    {
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($jane);
        $response = $this->postJson('/api/supervisors/weekly-logs', [
            'placement_id'     => $johnPlacement->id,
            'week_number'      => 12,
            'tasks_assigned'   => 'Build notification service.',
            'tasks_completed'  => 'Implemented FCM integration.',
            'conduct_score'    => 5,
            'attendance_score' => 5,
            'specific_feedback'=> 'Exceptional commitment.',
            'has_concern'      => false,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('weekly_logs', [
            'placement_id' => $johnPlacement->id,
            'week_number'  => 12,
        ]);
    }

    /**
     * Test 2: Unassigned supervisor cannot submit weekly performance log.
     */
    public function test_unassigned_supervisor_cannot_submit_weekly_log(): void
    {
        $mark = User::where('email', 'mark@kcbgroup.com')->first();
        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($mark);
        $response = $this->postJson('/api/supervisors/weekly-logs', [
            'placement_id'     => $johnPlacement->id,
            'week_number'      => 13,
            'conduct_score'    => 4,
            'attendance_score' => 4,
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 3: Duplicate weekly log is rejected.
     */
    public function test_duplicate_weekly_log_is_rejected(): void
    {
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($jane);
        $payload = [
            'placement_id'     => $johnPlacement->id,
            'week_number'      => 14,
            'conduct_score'    => 5,
            'attendance_score' => 5,
        ];

        $this->postJson('/api/supervisors/weekly-logs', $payload)->assertStatus(201);

        // Duplicate attempt must return 409 Conflict
        $response = $this->postJson('/api/supervisors/weekly-logs', $payload);
        $response->assertStatus(409);
    }

    /**
     * Test 4: Raising a concern creates a student flag in a single transaction.
     */
    public function test_concern_creates_student_flag_atomically(): void
    {
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($jane);
        $response = $this->postJson('/api/supervisors/weekly-logs', [
            'placement_id'     => $johnPlacement->id,
            'week_number'      => 15,
            'conduct_score'    => 2,
            'attendance_score' => 3,
            'has_concern'      => true,
            'concern_details'  => 'Repeatedly absent on Tuesdays without notice.',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('student_flags', [
            'placement_id' => $johnPlacement->id,
            'reason'       => 'weekly_concern',
            'details'      => 'Repeatedly absent on Tuesdays without notice.',
        ]);
    }

    /**
     * Test 5: Academic supervisor can schedule and manage field visit.
     */
    public function test_academic_supervisor_can_schedule_field_visit(): void
    {
        $alan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($alan);
        $response = $this->postJson('/api/field-visits', [
            'placement_id' => $johnPlacement->id,
            'visit_date'   => now()->addDays(5)->toDateString(),
            'visit_time'   => '10:00',
        ]);

        $response->assertStatus(201);
        $visitId = $response->json('id');

        // Update with notes and status
        $updateRes = $this->putJson("/api/field-visits/{$visitId}", [
            'status'                    => 'completed',
            'company_environment_notes' => 'Conducive engineering environment.',
            'student_performance_notes' => 'Excellent grasp of Laravel concepts.',
            'recommendations'           => 'Recommended for retention.',
        ]);

        $updateRes->assertStatus(200);
        $this->assertEquals('completed', $updateRes->json('status'));
    }

    /**
     * Test 6: Company supervisor cannot create field visits.
     */
    public function test_company_supervisor_cannot_create_field_visit(): void
    {
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($jane);
        $response = $this->postJson('/api/field-visits', [
            'placement_id' => $johnPlacement->id,
            'visit_date'   => now()->addDays(2)->toDateString(),
        ]);

        $response->assertStatus(403);
    }
}
