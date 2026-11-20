<?php

namespace Tests\Feature\Security;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Placement;
use App\Models\LogbookEntry;
use App\Models\Company;
use App\Models\Institution;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Evaluation;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\DB;

class AuthorizationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    /**
     * Test 1: All six documented roles have clearly defined permissions.
     */
    public function test_all_six_documented_roles_have_permissions(): void
    {
        $documentedRoles = [
            'student',
            'company',
            'company_supervisor',
            'academic_supervisor',
            'institution_admin',
            'super_admin',
        ];

        foreach ($documentedRoles as $roleName) {
            $role = Role::where('name', $roleName)->first();
            $this->assertNotNull($role, "Role '{$roleName}' must exist in the database.");
            $this->assertGreaterThan(0, $role->permissions()->count(), "Role '{$roleName}' must have assigned permissions.");
        }
    }

    /**
     * Test 2: Superadmin endpoints reject every non-superadmin with 403.
     */
    public function test_superadmin_endpoints_reject_non_superadmins(): void
    {
        $student = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $admin = User::where('email', 'admin@uonbi.ac.ke')->first();
        $companySup = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $superadmin = User::where('email', 'superadmin@indutrack.ke')->first();

        // Student forbidden
        Sanctum::actingAs($student);
        $this->getJson('/api/superadmin/dashboard')->assertStatus(403);
        $this->getJson('/api/superadmin/users')->assertStatus(403);

        // Institution admin forbidden
        Sanctum::actingAs($admin);
        $this->getJson('/api/superadmin/dashboard')->assertStatus(403);

        // Company supervisor forbidden
        Sanctum::actingAs($companySup);
        $this->getJson('/api/superadmin/dashboard')->assertStatus(403);

        // Superadmin allowed
        Sanctum::actingAs($superadmin);
        $this->getJson('/api/superadmin/dashboard')->assertStatus(200);
    }

    /**
     * Test 3: Institution administrators cannot access another institution's records.
     */
    public function test_institution_administrators_cannot_access_another_institutions_records(): void
    {
        $uonAdmin = User::where('email', 'admin@uonbi.ac.ke')->first();
        $strathAdmin = User::where('email', 'admin@strathmore.edu')->first();

        // UoN student
        $uonStudent = Student::whereHas('user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();
        $this->assertNotNull($uonStudent);

        // Strathmore student
        $strathStudent = Student::whereHas('user', fn($q) => $q->where('email', 'david.kamau@student.strathmore.edu'))->first();
        $this->assertNotNull($strathStudent);

        // Strathmore admin attempting to access UoN student details -> 403 Forbidden
        Sanctum::actingAs($strathAdmin);
        $response = $this->getJson("/api/admin/students/{$uonStudent->id}");
        $response->assertStatus(403);

        // UoN admin accessing UoN student -> 200 OK
        Sanctum::actingAs($uonAdmin);
        $this->getJson("/api/admin/students/{$uonStudent->id}")->assertStatus(200);

        // UoN admin attempting to access Strathmore student -> 403 Forbidden
        $this->getJson("/api/admin/students/{$strathStudent->id}")->assertStatus(403);
    }

    /**
     * Test 4: Company supervisors can only access assigned placements.
     */
    public function test_company_supervisors_can_only_access_assigned_placements(): void
    {
        // Jane is assigned to John Doe (Safaricom)
        $janeSafaricom = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        // Mark is assigned to Alice Wanjiru (KCB)
        $markKcb = User::where('email', 'mark@kcbgroup.com')->first();

        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();
        $this->assertNotNull($johnPlacement);

        // Mark (KCB) tries to view John's (Safaricom) logbook -> 403 Forbidden
        Sanctum::actingAs($markKcb);
        $this->getJson("/api/supervisors/placements/{$johnPlacement->id}/logbook")->assertStatus(403);

        // Mark tries to submit a weekly log for John's placement -> 403 Forbidden
        $this->postJson('/api/supervisors/weekly-logs', [
            'placement_id'     => $johnPlacement->id,
            'week_number'      => 15,
            'conduct_score'    => 5,
            'attendance_score' => 5,
        ])->assertStatus(403);

        // Jane (assigned supervisor) can view John's logbook -> 200 OK
        Sanctum::actingAs($janeSafaricom);
        $this->getJson("/api/supervisors/placements/{$johnPlacement->id}/logbook")->assertStatus(200);
    }

    /**
     * Test 5: Academic supervisors can only review assigned students.
     */
    public function test_academic_supervisors_can_only_review_assigned_students(): void
    {
        // Dr. Alan is assigned to John Doe
        // Dr. Wanjiku is assigned to Brian Otieno
        $drAlan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $drWanjiku = User::where('email', 'wanjiku@uonbi.ac.ke')->first();

        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();
        $johnLogbookEntry = LogbookEntry::where('placement_id', $johnPlacement->id)->first();
        $this->assertNotNull($johnLogbookEntry);

        // Dr. Wanjiku (not assigned to John) tries to review John's logbook entry -> 403 Forbidden
        Sanctum::actingAs($drWanjiku);
        $this->postJson("/api/logbooks/{$johnLogbookEntry->id}/review", [
            'action'  => 'approved',
            'comment' => 'Unauthorized review attempt',
        ])->assertStatus(403);

        // Dr. Wanjiku tries to grade John's placement -> 403 Forbidden
        $this->postJson("/api/placements/{$johnPlacement->id}/grade", [
            'grade' => 95,
        ])->assertStatus(403);

        // Dr. Alan (assigned academic supervisor) can review John's entry -> 200 OK
        Sanctum::actingAs($drAlan);
        $this->postJson("/api/logbooks/{$johnLogbookEntry->id}/review", [
            'action'  => 'approved',
            'comment' => 'Good work this week.',
        ])->assertStatus(200);
    }

    /**
     * Test 6: Students cannot modify another student's applications or logbooks.
     */
    public function test_students_cannot_modify_another_students_logbooks(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $alice = User::where('email', 'alice.wanjiru@student.uonbi.ac.ke')->first();

        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();
        $johnEntry = LogbookEntry::where('placement_id', $johnPlacement->id)->first();
        $this->assertNotNull($johnEntry);

        // Alice attempts to update John's logbook entry -> 403 Forbidden
        Sanctum::actingAs($alice);
        $this->putJson("/api/logbooks/{$johnEntry->id}", [
            'activities' => 'Tampered activities by another student',
        ])->assertStatus(403);
    }

    /**
     * Test 7: Evaluation type is derived from the authenticated user's actual role and placement assignment.
     */
    public function test_evaluation_type_is_derived_and_unauthorized_users_rejected(): void
    {
        $student = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        // Student tries to submit evaluation -> 403 Forbidden
        Sanctum::actingAs($student);
        $this->postJson('/api/evaluations', [
            'placement_id'        => $johnPlacement->id,
            'score_punctuality'   => 5,
            'score_attitude'      => 5,
            'score_technical'     => 5,
            'score_teamwork'      => 5,
            'score_communication' => 5,
            'would_accept_again'  => true,
            'evaluator_type'      => 'company_supervisor',
        ])->assertStatus(403);

        // Assigned company supervisor (Jane) submits evaluation -> 201 Created with derived evaluator_type
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        Sanctum::actingAs($jane);
        $response = $this->postJson('/api/evaluations', [
            'placement_id'        => $johnPlacement->id,
            'score_punctuality'   => 4,
            'score_attitude'      => 5,
            'score_technical'     => 4,
            'score_teamwork'      => 5,
            'score_communication' => 4,
            'would_accept_again'  => true,
        ]);

        $response->assertStatus(201);
        $this->assertEquals('company_supervisor', $response->json('evaluator_type'));
    }

    /**
     * Test 8: Institution admin with NULL institution_id gets 403 on all scoped endpoints.
     */
    public function test_institution_admin_with_null_institution_id_gets_403(): void
    {
        // Create an institution admin with no institution assigned
        $orphanAdmin = User::factory()->create([
            'name'               => 'Orphan Admin',
            'email'              => 'orphan.admin@test.ke',
            'email_verified_at'  => now(),
            'institution_id'     => null,
        ]);
        $adminRole = Role::where('name', 'institution_admin')->first();
        DB::table('user_roles')->insert(['user_id' => $orphanAdmin->id, 'role_id' => $adminRole->id]);

        Sanctum::actingAs($orphanAdmin);

        // Student list should return 403
        $this->getJson('/api/admin/students')->assertStatus(403);

        // Analytics dashboard should return 403
        $this->getJson('/api/admin/dashboard')->assertStatus(403);

        // Placements list should return 403
        $this->getJson('/api/admin/placements')->assertStatus(403);

        // Compliance report should return 403
        $this->getJson('/api/admin/compliance')->assertStatus(403);

        // Placement reports should return 403
        $this->getJson('/api/admin/reports/placements')->assertStatus(403);

        // Compliance reports should return 403
        $this->getJson('/api/admin/reports/compliance')->assertStatus(403);
    }

    /**
     * Test 9: Company supervisor cannot create attachment slots (manager-only operation).
     */
    public function test_company_supervisor_cannot_create_slots(): void
    {
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();

        Sanctum::actingAs($jane);
        $response = $this->postJson('/api/companies/slots', [
            'department' => 'Engineering',
            'capacity'   => 2,
        ]);

        // Must be 403 — route is restricted to role:company,super_admin
        $response->assertStatus(403);
    }

    /**
     * Test 10: Company supervisor cannot access field visit endpoints.
     */
    public function test_company_supervisor_cannot_access_field_visits(): void
    {
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();

        Sanctum::actingAs($jane);

        $this->getJson('/api/field-visits')->assertStatus(403);
        $this->postJson('/api/field-visits', [
            'placement_id' => 1,
            'visit_date'   => now()->toDateString(),
        ])->assertStatus(403);
    }

    /**
     * Test 11: Certificate generation fails for incomplete placement.
     */
    public function test_certificate_rejected_for_incomplete_placement(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        // John's placement is 'active', not 'completed' — certificate must be rejected
        $this->assertEquals('active', $johnPlacement->status);

        Sanctum::actingAs($john);
        $this->getJson("/api/students/placements/{$johnPlacement->id}/certificate")->assertStatus(403);
    }

    /**
     * Test 12: Certificate generation fails for completed placement missing one evaluator type.
     */
    public function test_certificate_rejected_when_missing_one_evaluator_type(): void
    {
        // Brian's placement is 'completed' with both evaluations in seeder
        $brian = User::where('email', 'brian.otieno@student.uonbi.ac.ke')->first();
        $brianPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'brian.otieno@student.uonbi.ac.ke'))->first();
        $this->assertEquals('completed', $brianPlacement->status);

        // Remove academic evaluation to simulate missing evaluator
        Evaluation::where('placement_id', $brianPlacement->id)
            ->where('evaluator_type', 'academic_supervisor')
            ->delete();

        Sanctum::actingAs($brian);
        $response = $this->getJson("/api/students/placements/{$brianPlacement->id}/certificate");
        $response->assertStatus(403);
        $this->assertStringContainsString('Academic supervisor evaluation is missing', $response->json('message'));
    }

    /**
     * Test 13: Certificate generation succeeds for completed placement with both evaluations.
     */
    public function test_certificate_approved_for_completed_placement_with_all_evaluations(): void
    {
        $brian = User::where('email', 'brian.otieno@student.uonbi.ac.ke')->first();
        $brianPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'brian.otieno@student.uonbi.ac.ke'))->first();

        // Both evaluations seeded — should succeed (not 403)
        $companyEval  = Evaluation::where('placement_id', $brianPlacement->id)->where('evaluator_type', 'company_supervisor')->exists();
        $academicEval = Evaluation::where('placement_id', $brianPlacement->id)->where('evaluator_type', 'academic_supervisor')->exists();
        $this->assertTrue($companyEval, 'Company evaluation must exist for Brian');
        $this->assertTrue($academicEval, 'Academic evaluation must exist for Brian');

        Sanctum::actingAs($brian);
        $response = $this->getJson("/api/students/placements/{$brianPlacement->id}/certificate");
        // Must not be 403 (authorization passed); 200 = PDF response or error from PDF lib in test env
        $this->assertNotEquals(403, $response->status(), 'Certificate should not be forbidden when all conditions are met');
    }

    /**
     * Test 14: Evaluation unique constraint prevents duplicate evaluator type per placement.
     */
    public function test_duplicate_evaluation_per_evaluator_type_is_rejected(): void
    {
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $payload = [
            'placement_id'        => $johnPlacement->id,
            'score_punctuality'   => 4,
            'score_attitude'      => 5,
            'score_technical'     => 4,
            'score_teamwork'      => 5,
            'score_communication' => 4,
            'would_accept_again'  => true,
        ];

        Sanctum::actingAs($jane);

        // First submission should succeed
        $this->postJson('/api/evaluations', $payload)->assertStatus(201);

        // Second submission (same type for same placement) must be rejected
        $this->postJson('/api/evaluations', $payload)->assertStatus(422);
    }

    /**
     * Test 15: Company manager from Company A cannot access Company B applicants.
     */
    public function test_company_manager_cannot_access_another_companys_applicants(): void
    {
        // Safaricom company manager
        $sfcManager = User::where('email', 'hr@safaricom.co.ke')->first();
        $this->assertNotNull($sfcManager, 'Safaricom company manager must exist');

        // Get a KCB slot to try to access
        $kcbCompany = Company::where('email', 'careers@kcbgroup.com')->first();
        $this->assertNotNull($kcbCompany, 'KCB company must exist');

        $kcbSlot = $kcbCompany->attachmentSlots()->first();
        $this->assertNotNull($kcbSlot, 'KCB must have attachment slots');

        Sanctum::actingAs($sfcManager);

        // Safaricom manager tries to access KCB's slot applicants -> 403 or 404
        // (findOrFail on company->slots returns 404 when slot doesn't belong to that company)
        $response = $this->getJson("/api/companies/slots/{$kcbSlot->id}/applicants");
        $response->assertStatus(404);
    }

    /**
     * Test 16: verifyCompany and blacklistCompany are super_admin only.
     */
    public function test_institution_admin_cannot_verify_or_blacklist_companies(): void
    {
        $admin   = User::where('email', 'admin@uonbi.ac.ke')->first();
        $company = Company::first();

        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/companies/{$company->id}/verify")->assertStatus(403);
        $this->putJson("/api/admin/companies/{$company->id}/blacklist", ['reason' => 'test'])->assertStatus(403);
    }

    /**
     * Test 17: Company supervisor cannot update application status (restricted to company manager / admin).
     */
    public function test_company_supervisor_cannot_update_application_status(): void
    {
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $this->assertNotNull($jane);

        // Find an application for Safaricom
        $application = \App\Models\Application::first();
        $this->assertNotNull($application);

        Sanctum::actingAs($jane);
        $response = $this->putJson("/api/applications/{$application->id}/status", [
            'status' => 'shortlisted',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 18: Conflicting company_id on company supervisor resolves strictly to supervisor relationship.
     */
    public function test_company_supervisor_with_conflicting_company_id_resolves_to_supervisor_company(): void
    {
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $sfcCompany = Company::where('email', 'hr@safaricom.co.ke')->first();
        $kcbCompany = Company::where('email', 'careers@kcbgroup.com')->first();

        $this->assertNotNull($sfcCompany);
        $this->assertNotNull($kcbCompany);

        // Intentionally set an inconsistent company_id on the user record
        $jane->update(['company_id' => $kcbCompany->id]);

        // getCompanyId() must strictly resolve to Safaricom (via CompanySupervisor), not KCB
        $this->assertEquals($sfcCompany->id, $jane->getCompanyId(), 'Supervisor must resolve to supervisor assignment even if users.company_id is set');

        Sanctum::actingAs($jane);
        $response = $this->getJson('/api/companies/slots');
        $response->assertStatus(200);

        // All returned slots must belong to Safaricom
        foreach ($response->json() as $slot) {
            $this->assertEquals($sfcCompany->id, $slot['company_id']);
        }
    }

    /**
     * Test 19: Profile retrieval uses explicit company_id relationship without email matching.
     */
    public function test_profile_operations_use_explicit_company_relationship_not_email(): void
    {
        $kcbCompany = Company::where('email', 'careers@kcbgroup.com')->first();

        // Create manager user whose email does NOT match company email
        $manager = User::factory()->create([
            'name'              => 'KCB Custom HR',
            'email'             => 'custom.manager@someotherdomain.com',
            'company_id'        => $kcbCompany->id,
            'email_verified_at' => now(),
        ]);
        $companyRole = Role::where('name', 'company')->first();
        DB::table('user_roles')->insert(['user_id' => $manager->id, 'role_id' => $companyRole->id]);

        Sanctum::actingAs($manager);
        $response = $this->getJson('/api/profile');
        $response->assertStatus(200);
        $this->assertEquals($kcbCompany->id, $response->json('company.id'));
    }

    /**
     * Test 20: Academic supervisor legacy alias resolves seamlessly without duplicate role assignment.
     */
    public function test_academic_supervisor_legacy_alias_resolves_without_dual_role_assignment(): void
    {
        $alan = User::where('email', 'supervisor@uonbi.ac.ke')->first();

        // Only canonical academic_supervisor role assigned in DB
        $assignedRoleCount = DB::table('user_roles')->where('user_id', $alan->id)->count();
        $this->assertEquals(1, $assignedRoleCount, 'User should only have one canonical supervisor role row assigned');

        // Alias resolution works bidirectionally
        $this->assertTrue($alan->hasRole('academic_supervisor'));
        $this->assertTrue($alan->hasRole('institution_supervisor'));
        $this->assertTrue($alan->hasRole('Academic Supervisor')); // case-insensitive / formatted
        $this->assertTrue($alan->isAcademicSupervisor());
    }
}
