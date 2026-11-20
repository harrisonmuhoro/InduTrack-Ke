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
use Laravel\Sanctum\Sanctum;

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
}
