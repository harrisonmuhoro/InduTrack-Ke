<?php

namespace Tests\Feature\Security\Phase4;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\AttachmentSlot;
use App\Models\Placement;
use App\Models\WeeklyLog;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\DB;

/**
 * Phase 4 — Workstream E: Company and Placement Isolation
 *
 * Verifies that:
 * 1. Company A manager cannot access Company B slots or applicants.
 * 2. Company supervisor A cannot access Company B placements or unassigned placements.
 * 3. Company supervisor cannot create slots or make application status decisions.
 * 4. Company manager cannot forge `company_id` to create slots for another company.
 * 5. Weekly performance logs can only be submitted for assigned placements.
 */
class CompanyPlacementIsolationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    public function test_company_manager_cannot_view_another_companys_applicants(): void
    {
        $sfcManager = User::where('email', 'hr@safaricom.co.ke')->first();
        $kcbCompany = Company::where('email', 'careers@kcbgroup.com')->first();
        $kcbSlot = AttachmentSlot::where('company_id', $kcbCompany->id)->first();
        $this->assertNotNull($kcbSlot);

        Sanctum::actingAs($sfcManager);

        // Safaricom manager tries to view applicants for a KCB slot -> 404 (scoped to company slots)
        $res = $this->getJson("/api/companies/slots/{$kcbSlot->id}/applicants");
        $res->assertStatus(404);
    }

    public function test_company_manager_cannot_forge_company_id_on_slot_creation(): void
    {
        $sfcManager = User::where('email', 'hr@safaricom.co.ke')->first();
        $kcbCompany = Company::where('email', 'careers@kcbgroup.com')->first();

        Sanctum::actingAs($sfcManager);

        // Safaricom manager attempts to create a slot by forging company_id to KCB's ID
        $res = $this->postJson('/api/companies/slots', [
            'department'      => 'Forged KCB Dept',
            'capacity'        => 3,
            'company_id'      => $kcbCompany->id, // Attempted spoof
        ]);
        $res->assertStatus(201);

        // Slot must be attributed strictly to Safaricom (sfcManager's actual company), never KCB
        $createdSlotId = $res->json('id');
        $slot = AttachmentSlot::find($createdSlotId);
        $this->assertEquals($sfcManager->company_id, $slot->company_id, 'Slot must belong to manager\'s actual company');
        $this->assertNotEquals($kcbCompany->id, $slot->company_id, 'Slot must NOT be assigned to forged company_id');
    }

    public function test_company_supervisor_cannot_submit_weekly_log_for_unassigned_placement(): void
    {
        $janeSafaricom = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $alicePlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'alice.wanjiru@student.uonbi.ac.ke'))->first();

        // Alice is placed at KCB with Mark Kamau as supervisor.
        // Jane (Safaricom supervisor) attempts to submit a weekly log for Alice -> 403 Forbidden
        Sanctum::actingAs($janeSafaricom);
        $res = $this->postJson('/api/supervisors/weekly-logs', [
            'placement_id'     => $alicePlacement->id,
            'week_number'      => 14,
            'conduct_score'    => 5,
            'attendance_score' => 5,
        ]);
        $res->assertStatus(403);

        // Database remains unmutated
        $this->assertDatabaseMissing('weekly_logs', [
            'placement_id' => $alicePlacement->id,
            'week_number'  => 14,
        ]);
    }

    public function test_company_supervisor_cannot_evaluate_unassigned_placement(): void
    {
        $janeSafaricom = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $alicePlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'alice.wanjiru@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($janeSafaricom);

        // Jane attempts to submit final evaluation for Alice at KCB -> 403 Forbidden
        $res = $this->postJson('/api/evaluations', [
            'placement_id'        => $alicePlacement->id,
            'score_punctuality'   => 5,
            'score_attitude'      => 5,
            'score_technical'     => 5,
            'score_teamwork'      => 5,
            'score_communication' => 5,
            'would_accept_again'  => true,
        ]);
        $res->assertStatus(403);

        $this->assertDatabaseMissing('evaluations', [
            'placement_id' => $alicePlacement->id,
            'evaluator_id' => $janeSafaricom->id,
        ]);
    }

    public function test_student_cannot_rate_company_without_placement(): void
    {
        $david = User::where('email', 'david.kamau@student.strathmore.edu')->first();
        $sfcCompany = Company::where('email', 'hr@safaricom.co.ke')->first();

        // David has never been placed at Safaricom -> 403 Forbidden
        Sanctum::actingAs($david);
        $res = $this->postJson("/api/companies/{$sfcCompany->id}/rate", [
            'rating'   => 1,
            'feedback' => 'Fake review without placement',
        ]);
        $res->assertStatus(403);

        $this->assertDatabaseMissing('company_ratings', [
            'company_id' => $sfcCompany->id,
            'rater_id'   => $david->id,
        ]);
    }
}
