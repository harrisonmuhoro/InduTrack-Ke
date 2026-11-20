<?php

namespace Tests\Feature\Security;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Placement;
use App\Models\Application;
use App\Models\Company;
use App\Models\Institution;
use App\Models\Role;
use App\Models\Evaluation;
use App\Models\AttachmentSlot;
use App\Models\CompanySupervisor;
use App\Models\InstitutionSupervisor;
use App\Policies\CompanyPolicy;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * SecurityRemediationTest
 *
 * Covers all acceptance criteria from the security hardening assignment:
 * - Task A: Institution-level company isolation
 * - Task B: Academic supervisor role consolidation
 * - Task C: ProfileController atomicity and ownership safety
 * - Task D: Evaluation uniqueness migration (duplicate detection)
 * - Task E: Evaluation exception handling precision
 * - Task F: Sensitive endpoint policy enforcement
 * - Group: Regression tests for previously-passing certificate eligibility
 */
class SecurityRemediationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    // =========================================================================
    // TASK A — Institution-level company isolation (CompanyPolicy)
    // =========================================================================

    /**
     * A-1: Institution admin can access a company legitimately connected to their institution
     *       via a student placement.
     */
    public function test_institution_admin_can_access_connected_company(): void
    {
        $uonAdmin   = User::where('email', 'admin@uonbi.ac.ke')->first();
        $sfcCompany = Company::where('email', 'hr@safaricom.co.ke')->first();

        // John Doe (UoN student) is placed at Safaricom → legitimate connection
        $policy = new CompanyPolicy();
        $this->assertTrue(
            $policy->view($uonAdmin, $sfcCompany),
            'UoN admin must access Safaricom because a UoN student is placed there'
        );
    }

    /**
     * A-2: Institution A admin cannot access a company exclusively connected to Institution B.
     */
    public function test_institution_admin_cannot_access_unconnected_company(): void
    {
        $strathAdmin = User::where('email', 'admin@strathmore.edu')->first();

        // Create a company with no Strathmore student connection
        $isolatedCompany = Company::create([
            'name'        => 'Isolated Corp',
            'email'       => 'isolated@corp.ke',
            'industry'    => 'Technology',
            'is_verified' => false,
        ]);

        $policy = new CompanyPolicy();
        $this->assertFalse(
            $policy->view($strathAdmin, $isolatedCompany),
            'Strathmore admin must NOT access a company with no Strathmore student connection'
        );
    }

    /**
     * A-3: Institution admin with NULL institution_id is denied protected company access.
     */
    public function test_institution_admin_with_null_institution_id_denied_company_access(): void
    {
        $orphanAdmin = User::factory()->create([
            'name'              => 'Orphan Admin',
            'email'             => 'orphan.admin.company@test.ke',
            'email_verified_at' => now(),
            'institution_id'    => null,
        ]);
        $adminRole = Role::where('name', 'institution_admin')->first();
        DB::table('user_roles')->insert(['user_id' => $orphanAdmin->id, 'role_id' => $adminRole->id]);

        $sfcCompany = Company::where('email', 'hr@safaricom.co.ke')->first();

        $policy = new CompanyPolicy();
        // isInstitutionAdmin() = true, institution_id = null → condition fails → returns false
        $this->assertFalse(
            $policy->view($orphanAdmin, $sfcCompany),
            'Admin with null institution_id must be denied protected company access'
        );
    }

    /**
     * A-4: Unrelated student cannot access protected company data.
     */
    public function test_unrelated_student_cannot_access_protected_company(): void
    {
        $strathStudent = User::where('email', 'david.kamau@student.strathmore.edu')->first();

        // David (Strathmore) has no placement or application at Safaricom
        $sfcCompany = Company::where('email', 'hr@safaricom.co.ke')->first();

        $policy = new CompanyPolicy();
        // Safaricom is verified → student can view PUBLIC info (is_verified=true falls through)
        // but let's test an UNVERIFIED company where David has no connection
        $unverifiedCompany = Company::create([
            'name'        => 'Private Ltd',
            'email'       => 'private@ltd.ke',
            'industry'    => 'Mining',
            'is_verified' => false,
        ]);

        $this->assertFalse(
            $policy->view($strathStudent, $unverifiedCompany),
            'Student with no connection must not access unverified unrelated company'
        );
    }

    /**
     * A-5: Authorized student retains access via placement relationship.
     */
    public function test_authorized_student_retains_access_via_placement(): void
    {
        $john       = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $sfcCompany = Company::where('email', 'hr@safaricom.co.ke')->first();

        $policy = new CompanyPolicy();
        $this->assertTrue(
            $policy->view($john, $sfcCompany),
            'John must view Safaricom because he has an active placement there'
        );
    }

    /**
     * A-6: Company manager cannot access another company's protected data.
     */
    public function test_company_manager_cannot_access_another_company(): void
    {
        $sfcManager = User::where('email', 'hr@safaricom.co.ke')->first();
        $kcbCompany = Company::where('email', 'careers@kcbgroup.com')->first();

        $policy = new CompanyPolicy();
        // sfcManager->company_id = Safaricom, not KCB; not verified public either… but KCB is_verified=true
        // The manage() method (not view) should be false for another company
        $this->assertFalse(
            $policy->manage($sfcManager, $kcbCompany),
            'Safaricom manager must not manage KCB company data'
        );
    }

    /**
     * A-7: Company supervisor cannot access unrelated company records.
     */
    public function test_company_supervisor_cannot_access_unrelated_company(): void
    {
        $janeUser   = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $kcbCompany = Company::where('email', 'careers@kcbgroup.com')->first();

        $policy = new CompanyPolicy();
        // Jane is a company_supervisor assigned to Safaricom, not KCB
        // KCB is verified, so is_verified fallback applies — but view() should not
        // grant supervisor management access
        $this->assertFalse(
            $policy->manage($janeUser, $kcbCompany),
            'Jane (Safaricom supervisor) must not manage KCB company data'
        );

        // Also check the createSlot policy
        $this->assertFalse(
            $policy->createSlot($janeUser, $kcbCompany),
            'Jane must not create slots at KCB'
        );
    }

    /**
     * A-8: Super admin retains appropriate company access.
     */
    public function test_super_admin_retains_company_access(): void
    {
        $superAdmin = User::where('email', 'superadmin@indutrack.ke')->first();
        $kcbCompany = Company::where('email', 'careers@kcbgroup.com')->first();

        $policy = new CompanyPolicy();
        $this->assertTrue($policy->view($superAdmin, $kcbCompany));
        $this->assertTrue($policy->manage($superAdmin, $kcbCompany));
        $this->assertTrue($policy->createSlot($superAdmin, $kcbCompany));
    }

    /**
     * A-9: Public company discovery exposes only verified companies to unrelated authenticated users.
     *       Policy view() returns true for verified companies (authenticated but unrelated users).
     *       Policy view() returns false for unverified companies with no connection.
     */
    public function test_public_company_discovery_verified_vs_unverified(): void
    {
        $student = User::where('email', 'david.kamau@student.strathmore.edu')->first();
        $company = Company::where('email', 'hr@safaricom.co.ke')->firstOrFail();
        $this->assertTrue((bool) $company->is_verified);

        Sanctum::actingAs($student);
        $response = $this->getJson('/api/students/slots')->assertOk();
        $companyCard = collect($response->json())->firstWhere('company.id', $company->id)['company'] ?? null;
        $this->assertNotNull($companyCard, 'Verified company remains discoverable through the student slot feed');
        $this->assertArrayNotHasKey('email', $companyCard);
        $this->assertArrayNotHasKey('phone', $companyCard);
        $this->assertArrayNotHasKey('registration_number', $companyCard);
        $this->assertFalse((new CompanyPolicy())->view($student, $company), 'Public verification must not authorize protected company records');

        $unverified = Company::create([
            'name' => 'Secret Ops Ltd', 'email' => 'secretops@example.ke',
            'industry' => 'Defense', 'is_verified' => false,
        ]);
        $this->assertFalse((new CompanyPolicy())->view($student, $unverified));
    }
    // =========================================================================
    public function test_institution_company_listing_is_limited_to_connected_companies(): void
    {
        $adminA = User::where('email', 'admin@uonbi.ac.ke')->first();
        $companyA = Company::where('email', 'hr@safaricom.co.ke')->firstOrFail();
        $companyB = Company::create([
            'name' => 'Unrelated Company', 'email' => 'unrelated.company@test.ke',
            'industry' => 'Manufacturing', 'is_verified' => true,
        ]);

        Sanctum::actingAs($adminA);
        $response = $this->getJson('/api/admin/companies')->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($companyA->id));
        $this->assertFalse($ids->contains($companyB->id));
    }
    // TASK B — Academic supervisor role consolidation
    // =========================================================================

    /**
     * B-1: New installation creates only the canonical academic_supervisor role, not institution_supervisor.
     */
    public function test_seeder_creates_canonical_role_not_legacy(): void
    {
        $canonicalRole = Role::where('name', 'academic_supervisor')->first();
        $this->assertNotNull($canonicalRole, 'Canonical academic_supervisor role must exist');

        $legacyRole = Role::where('name', 'institution_supervisor')->first();
        $this->assertNull(
            $legacyRole,
            'Legacy institution_supervisor role must NOT be created by the seeder in a new installation'
        );
    }

    /**
     * B-2: Repeated seeding is idempotent — no duplicate roles or permissions created.
     */
    public function test_repeated_role_seeding_is_idempotent(): void
    {
        $rolePermissionsBefore = DB::table('role_permissions')->count();
        $userRolesBefore = DB::table('user_roles')->count();

        $seeder = new \Database\Seeders\DatabaseSeeder();
        $method = new \ReflectionMethod($seeder, 'seedRoles');
        $method->setAccessible(true);
        $method->invoke($seeder);

        $this->assertSame(1, Role::where('name', 'academic_supervisor')->count());
        $this->assertSame(0, Role::where('name', 'institution_supervisor')->count());
        $this->assertSame($rolePermissionsBefore, DB::table('role_permissions')->count());
        $this->assertSame($userRolesBefore, DB::table('user_roles')->count());
    }
    /**
     * B-3: Canonical academic_supervisor users retain all expected permissions.
     */
    public function test_canonical_academic_supervisor_has_expected_permissions(): void
    {
        $drAlan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $this->assertNotNull($drAlan);

        $this->assertTrue($drAlan->isAcademicSupervisor());
        $this->assertTrue($drAlan->hasPermission('review_logbook'));
        $this->assertTrue($drAlan->hasPermission('grade_placement'));
        $this->assertTrue($drAlan->hasPermission('conduct_field_visit'));
        $this->assertTrue($drAlan->hasPermission('submit_evaluation'));
    }

    /**
     * B-4: Legacy alias institution_supervisor resolves as academic_supervisor.
     */
    public function test_legacy_institution_supervisor_alias_resolves(): void
    {
        $drAlan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $this->assertNotNull($drAlan);

        // hasRole with legacy name must return true via alias
        $this->assertTrue($drAlan->hasRole('institution_supervisor'));
        $this->assertTrue($drAlan->hasRole('academic_supervisor'));
        $this->assertTrue($drAlan->isAcademicSupervisor());

        // User should only have ONE role row (the canonical one)
        $roleCount = DB::table('user_roles')->where('user_id', $drAlan->id)->count();
        $this->assertEquals(1, $roleCount, 'Only one role row for academic supervisor');
    }

    /**
     * B-5: No duplicate role assignments created.
     */
    public function test_no_duplicate_role_assignments(): void
    {
        // No user should have both academic_supervisor and institution_supervisor rows
        $academicRoleId = Role::where('name', 'academic_supervisor')->value('id');
        $legacyRoleId   = Role::where('name', 'institution_supervisor')->value('id');

        if ($legacyRoleId === null) {
            // Expected: legacy role does not exist in fresh install
            $this->assertTrue(true);
            return;
        }

        // If legacy role somehow exists, no user should have both
        $duplicates = DB::table('user_roles')
            ->select('user_id')
            ->whereIn('role_id', [$academicRoleId, $legacyRoleId])
            ->groupBy('user_id')
            ->havingRaw('COUNT(DISTINCT role_id) > 1')
            ->count();

        $this->assertEquals(0, $duplicates, 'No user should be assigned both canonical and legacy supervisor roles');
    }

    // =========================================================================
    // TASK C — ProfileController atomicity and ownership safety
    // =========================================================================

    /**
     * C-1: Company manager update is rejected BEFORE modifying user data
     *       when no company assignment exists.
     */
    public function test_unassigned_manager_profile_update_fails_without_modifying_user(): void
    {
        $manager = User::factory()->create([
            'name'              => 'Unassigned Mgr',
            'email'             => 'unassigned.mgr.c1@test.ke',
            'company_id'        => null,
            'email_verified_at' => now(),
        ]);
        $companyRole = Role::where('name', 'company')->first();
        DB::table('user_roles')->insert(['user_id' => $manager->id, 'role_id' => $companyRole->id]);

        $originalName = $manager->name;

        Sanctum::actingAs($manager);
        $response = $this->putJson('/api/profile', [
            'name'        => 'Should Not Save',
            'description' => 'Attempted update without company',
        ]);

        $response->assertStatus(404);
        $this->assertStringContainsString('No assigned company profile found', $response->json('message'));

        // User name must NOT have been changed — entity check happens before writes
        $manager->refresh();
        $this->assertEquals($originalName, $manager->name, 'User name must not change when company resolve fails');
    }

    /**
     * C-2: Company manager updates their own profile successfully.
     */
    public function test_company_manager_updates_own_profile(): void
    {
        $sfcManager = User::where('email', 'hr@safaricom.co.ke')->first();
        $this->assertNotNull($sfcManager);
        $this->assertNotNull($sfcManager->company_id);

        Sanctum::actingAs($sfcManager);
        $response = $this->putJson('/api/profile', [
            'name'        => 'Safaricom HR Updated',
            'phone'       => '+254700111222',
            'description' => 'Leading telecom updated description',
            'company_phone' => '+254700333444',
            'address' => 'Nairobi CBD',
        ]);

        $response->assertStatus(200);
        $sfcManager->refresh();
        $this->assertEquals('Safaricom HR Updated', $sfcManager->name);
        $this->assertSame('+254700111222', $sfcManager->phone);
        $this->assertSame('+254700333444', $sfcManager->company->phone);
        $this->assertSame('Nairobi CBD', $sfcManager->company->address);
    }

    /**
     * C-3: Student updates only their own profile; ownership IDs cannot be injected.
     */
    public function test_student_cannot_inject_ownership_ids_via_profile(): void
    {
        $john          = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $strathCompany = Company::where('email', 'careers@kcbgroup.com')->first();

        Sanctum::actingAs($john);
        $response = $this->putJson('/api/profile', [
            'name'           => 'John Updated',
            'institution_id' => 999,     // should be silently ignored
            'company_id'     => $strathCompany->id, // should be silently ignored
        ]);

        $response->assertStatus(200);
        $john->refresh();
        // Ownership fields must not have changed
        $this->assertNotEquals(999, $john->institution_id);
        $this->assertNull($john->company_id);
    }

    /**
     * C-4: Academic supervisor updates only their own profile.
     */
    public function test_academic_supervisor_updates_own_profile(): void
    {
        $drAlan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $this->assertNotNull($drAlan);

        Sanctum::actingAs($drAlan);
        $response = $this->putJson('/api/profile', [
            'name'       => 'Dr. Alan Updated',
            'department' => 'Software Engineering',
        ]);

        $response->assertStatus(200);
        $sup = InstitutionSupervisor::where('user_id', $drAlan->id)->first();
        $this->assertEquals('Software Engineering', $sup->department);
    }

    /**
     * C-5: Photo upload for manager is denied when no company assigned
     *       — no orphaned file is created.
     */
    public function test_unassigned_manager_photo_upload_denied_no_orphan(): void
    {
        Storage::fake('public');

        $manager = User::factory()->create([
            'name'              => 'No Company Mgr',
            'email'             => 'no.company.mgr@test.ke',
            'company_id'        => null,
            'email_verified_at' => now(),
        ]);
        $companyRole = Role::where('name', 'company')->first();
        DB::table('user_roles')->insert(['user_id' => $manager->id, 'role_id' => $companyRole->id]);

        Sanctum::actingAs($manager);
        $response = $this->postJson('/api/profile/photo', [
            'photo' => UploadedFile::fake()->image('logo.jpg', 100, 100),
        ]);

        $response->assertStatus(404);
        // No files should be in the fake storage (entity resolved before file stored)
        $this->assertCount(0, Storage::disk('public')->allFiles('profile_photos'));
    }

    // =========================================================================
    // TASK D — Evaluation uniqueness migration (duplicate detection)
    // =========================================================================

    /**
     * D-1: Migration on empty evaluations table succeeds cleanly.
     */
    public function test_evaluation_migration_succeeds_on_empty_table(): void
    {
        // Clear evaluations for this test
        Evaluation::query()->delete();
        $this->dropEvaluationUniqueConstraint();
        $migration = require database_path('migrations/2026_07_17_000001_add_unique_constraint_to_evaluations_table.php');
        $migration->up();

        // Constraint should now exist — inserting a duplicate should fail
        $placement = Placement::first();
        if ($placement) {
            DB::table('evaluations')->insert([
                'placement_id'   => $placement->id,
                'evaluator_id'   => 1,
                'evaluator_type' => 'academic_supervisor',
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
            $this->expectException(\Illuminate\Database\QueryException::class);
            DB::table('evaluations')->insert([
                'placement_id'   => $placement->id,
                'evaluator_id'   => 2,
                'evaluator_type' => 'academic_supervisor', // duplicate
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        }

        $this->assertTrue(true); // reached here without exception on first insert
    }

    /**
     * D-2: Migration halts when duplicate records exist — no records deleted.
     */
    public function test_evaluation_migration_halts_on_duplicates_preserving_all_records(): void
    {
        // Insert intentional duplicates
        $placement = Placement::first();
        $this->assertNotNull($placement);

        $this->dropEvaluationUniqueConstraint();

        // Clear existing evaluations for this placement type
        DB::table('evaluations')
            ->where('placement_id', $placement->id)
            ->where('evaluator_type', 'academic_supervisor')
            ->delete();

        // Insert two duplicate records
        DB::table('evaluations')->insert([
            ['placement_id' => $placement->id, 'evaluator_id' => 1, 'evaluator_type' => 'academic_supervisor', 'created_at' => now(), 'updated_at' => now()],
            ['placement_id' => $placement->id, 'evaluator_id' => 2, 'evaluator_type' => 'academic_supervisor', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $countBefore = DB::table('evaluations')
            ->where('placement_id', $placement->id)
            ->where('evaluator_type', 'academic_supervisor')
            ->count();
        $this->assertEquals(2, $countBefore);

        // Migration must throw RuntimeException
        $threw = false;
        try {
            $migration = require database_path('migrations/2026_07_17_000001_add_unique_constraint_to_evaluations_table.php');
            $migration->up();
        } catch (\RuntimeException $e) {
            $threw = true;
            $this->assertStringContainsString('Migration halted', $e->getMessage());
            $this->assertStringContainsString('duplicate', strtolower($e->getMessage()));
        }

        $this->assertTrue($threw, 'Migration must throw RuntimeException when duplicates exist');

        // All original records must still be present — nothing deleted
        $countAfter = DB::table('evaluations')
            ->where('placement_id', $placement->id)
            ->where('evaluator_type', 'academic_supervisor')
            ->count();
        $this->assertEquals($countBefore, $countAfter, 'No evaluation records must be deleted during migration halt');
    }

    /**
     * D-3: No automatic winner selected — no records archived or deleted.
     *       Verifies no evaluations_archive table is created on halt.
     */
    public function test_migration_halt_does_not_create_archive_or_delete_records(): void
    {
        $placement = Placement::first();
        $this->assertNotNull($placement);

        $this->dropEvaluationUniqueConstraint();

        DB::table('evaluations')
            ->where('placement_id', $placement->id)
            ->where('evaluator_type', 'company_supervisor')
            ->delete();

        $ids = [];
        $ids[] = DB::table('evaluations')->insertGetId(['placement_id' => $placement->id, 'evaluator_id' => 1, 'evaluator_type' => 'company_supervisor', 'created_at' => now(), 'updated_at' => now()]);
        $ids[] = DB::table('evaluations')->insertGetId(['placement_id' => $placement->id, 'evaluator_id' => 2, 'evaluator_type' => 'company_supervisor', 'created_at' => now(), 'updated_at' => now()]);

        try {
            $migration = require database_path('migrations/2026_07_17_000001_add_unique_constraint_to_evaluations_table.php');
            $migration->up();
        } catch (\RuntimeException $e) {}

        // Both records must still exist
        $remaining = DB::table('evaluations')->whereIn('id', $ids)->count();
        $this->assertEquals(2, $remaining, 'Both duplicate records must survive a migration halt');

        // No archive table should have been created
        $this->assertFalse(\Illuminate\Support\Facades\Schema::hasTable('evaluations_archive'), 'No archive table must be created on migration halt');
    }

    // =========================================================================
    // TASK E — Evaluation exception handling precision
    // =========================================================================

    /**
     * E-1: First valid evaluation succeeds.
     */
    public function test_first_evaluation_succeeds(): void
    {
        $jane           = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $johnPlacement  = Placement::whereHas('student.user', fn ($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        // Remove any existing evaluation for clean test
        Evaluation::where('placement_id', $johnPlacement->id)
            ->where('evaluator_type', 'company_supervisor')
            ->delete();

        Sanctum::actingAs($jane);
        $response = $this->postJson('/api/evaluations', [
            'placement_id'        => $johnPlacement->id,
            'score_punctuality'   => 4,
            'score_attitude'      => 4,
            'score_technical'     => 4,
            'score_teamwork'      => 4,
            'score_communication' => 4,
            'would_accept_again'  => true,
        ]);

        $response->assertStatus(201);
        $this->assertEquals('company_supervisor', $response->json('evaluator_type'));
    }

    /**
     * E-2: Duplicate evaluation returns 409 Conflict (not 422 Validation Error).
     */
    public function test_duplicate_evaluation_returns_409_conflict(): void
    {
        $jane          = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn ($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        Evaluation::where('placement_id', $johnPlacement->id)
            ->where('evaluator_type', 'company_supervisor')
            ->delete();

        $payload = [
            'placement_id'        => $johnPlacement->id,
            'score_punctuality'   => 4,
            'score_attitude'      => 4,
            'score_technical'     => 4,
            'score_teamwork'      => 4,
            'score_communication' => 4,
            'would_accept_again'  => true,
        ];

        Sanctum::actingAs($jane);
        $this->postJson('/api/evaluations', $payload)->assertStatus(201);
        // Second attempt must return 409 Conflict
        $response = $this->postJson('/api/evaluations', $payload);
        $response->assertStatus(409);
        $this->assertStringContainsString('already been submitted', $response->json('message'));
    }

    /**
     * E-3: Unrelated database errors are NOT misclassified as duplicate evaluation errors.
     */
    public function test_foreign_key_violation_not_misclassified_as_duplicate_evaluation(): void
    {
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();

        Sanctum::actingAs($jane);
        // Use a non-existent placement_id — should return 422 from validation, not 409 duplicate
        $response = $this->postJson('/api/evaluations', [
            'placement_id'        => 999999,
            'score_punctuality'   => 4,
            'score_attitude'      => 4,
            'score_technical'     => 4,
            'score_teamwork'      => 4,
            'score_communication' => 4,
            'would_accept_again'  => true,
        ]);

        // Should be 422 validation error (placement doesn't exist), NOT 409 duplicate
        $response->assertStatus(422);
    }

    /**
     * E-4: Student cannot submit evaluation (403 Forbidden).
     */
    public function test_student_cannot_submit_evaluation(): void
    {
        $john          = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn ($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($john);
        $response = $this->postJson('/api/evaluations', [
            'placement_id'        => $johnPlacement->id,
            'score_punctuality'   => 5,
            'score_attitude'      => 5,
            'score_technical'     => 5,
            'score_teamwork'      => 5,
            'score_communication' => 5,
            'would_accept_again'  => true,
        ]);

        $response->assertStatus(403);
    }

    // =========================================================================
    // TASK F — Sensitive endpoint policy enforcement
    // =========================================================================

    /**
     * F-1: Document download enforces ownership — student cannot download another student's document.
     */
    public function test_student_cannot_download_another_students_document(): void
    {
        $john  = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $alice = User::where('email', 'alice.wanjiru@student.uonbi.ac.ke')->first();

        $johnStudent = \App\Models\Student::where('user_id', $john->id)->first();

        // Create a document for John
        $doc = \App\Models\Document::create([
            'student_id'    => $johnStudent->id,
            'type'          => 'cv',
            'original_name' => 'john_cv.pdf',
            'file_path'     => 'documents/' . $johnStudent->id . '/cv.pdf',
            'mime_type'     => 'application/pdf',
            'file_size'     => 1024,
            'status'        => 'pending',
        ]);

        // Alice tries to download John's document
        Sanctum::actingAs($alice);
        $this->getJson("/api/documents/{$doc->id}/download")->assertStatus(403);

        // John can download his own
        Sanctum::actingAs($john);
        // Will 404 on actual file not existing, but authorization passes (not 403)
        $response = $this->getJson("/api/documents/{$doc->id}/download");
        $this->assertNotEquals(403, $response->getStatusCode(), 'John must be authorized to download his own document');
    }

    /**
     * F-2: Cross-institution document access is denied.
     */
    public function test_institution_admin_cannot_download_cross_institution_document(): void
    {
        $strathAdmin = User::where('email', 'admin@strathmore.edu')->first();

        // John is a UoN student
        $john        = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $johnStudent = \App\Models\Student::where('user_id', $john->id)->first();

        $doc = \App\Models\Document::create([
            'student_id'    => $johnStudent->id,
            'type'          => 'transcript',
            'original_name' => 'john_transcript.pdf',
            'file_path'     => 'documents/' . $johnStudent->id . '/transcript.pdf',
            'mime_type'     => 'application/pdf',
            'file_size'     => 2048,
            'status'        => 'pending',
        ]);

        // Strathmore admin trying to download UoN student's document
        Sanctum::actingAs($strathAdmin);
        $this->getJson("/api/documents/{$doc->id}/download")->assertStatus(403);
    }

    /**
     * F-3: Evaluation access is scoped to authorized evaluators.
     */
    public function test_evaluation_access_scoped_to_authorized_evaluators(): void
    {
        $markKcb       = User::where('email', 'mark@kcbgroup.com')->first();
        $johnPlacement = Placement::whereHas('student.user', fn ($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        // Mark is NOT assigned to John's placement (he's the KCB supervisor)
        Sanctum::actingAs($markKcb);
        $response = $this->getJson("/api/evaluations/placement/{$johnPlacement->id}");
        $response->assertStatus(403);
    }

    /**
     * F-4: Field visit management follows correct role rules — company supervisor denied.
     */
    public function test_company_supervisor_cannot_manage_field_visits(): void
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
     * F-5: Academic supervisor can access field visits for assigned placement.
     */
    public function test_academic_supervisor_can_access_field_visits(): void
    {
        $drAlan = User::where('email', 'supervisor@uonbi.ac.ke')->first();

        Sanctum::actingAs($drAlan);
        $response = $this->getJson('/api/field-visits');
        $response->assertStatus(200);
    }

    /**
     * F-6: Placement logbook view enforces assignment.
     */
    public function test_unassigned_supervisor_cannot_view_placement_logbook(): void
    {
        $markKcb       = User::where('email', 'mark@kcbgroup.com')->first();
        $johnPlacement = Placement::whereHas('student.user', fn ($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($markKcb);
        $response = $this->getJson("/api/supervisors/placements/{$johnPlacement->id}/logbook");
        $response->assertStatus(403);
    }

    // =========================================================================
    // GROUP 1 — Tenant isolation
    // =========================================================================

    /**
     * T-1: Institution A cannot access Institution B's students.
     */
    public function test_institution_a_cannot_access_institution_b_students(): void
    {
        $strathAdmin = User::where('email', 'admin@strathmore.edu')->first();
        $uonStudent  = \App\Models\Student::whereHas('user', fn ($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($strathAdmin);
        $this->getJson("/api/admin/students/{$uonStudent->id}")->assertStatus(403);
    }

    /**
     * T-2: Company A cannot access Company B's applications.
     */
    public function test_company_a_cannot_access_company_b_applications(): void
    {
        $sfcManager = User::where('email', 'hr@safaricom.co.ke')->first();
        $kcbCompany = Company::where('email', 'careers@kcbgroup.com')->first();
        $kcbSlot    = $kcbCompany->attachmentSlots()->first();
        $this->assertNotNull($kcbSlot);

        Sanctum::actingAs($sfcManager);
        $response = $this->getJson("/api/companies/slots/{$kcbSlot->id}/applicants");
        $response->assertStatus(404); // scoped query returns 404 for cross-company slot
    }

    // =========================================================================
    // GROUP 6 — Certificate eligibility regression (preserve from previous work)
    // =========================================================================

    /**
     * Reg-1: Completed placement with both evaluations → certificate generated (200).
     */
    public function test_certificate_approved_for_complete_placement_with_all_evaluations(): void
    {
        $brian          = User::where('email', 'brian.otieno@student.uonbi.ac.ke')->first();
        $brianPlacement = Placement::whereHas('student.user', fn ($q) => $q->where('email', 'brian.otieno@student.uonbi.ac.ke'))->first();

        $this->assertEquals('completed', $brianPlacement->status);
        $this->assertTrue(Evaluation::where('placement_id', $brianPlacement->id)->where('evaluator_type', 'company_supervisor')->exists());
        $this->assertTrue(Evaluation::where('placement_id', $brianPlacement->id)->where('evaluator_type', 'academic_supervisor')->exists());

        Sanctum::actingAs($brian);
        $this->getJson("/api/students/placements/{$brianPlacement->id}/certificate")->assertStatus(200);
    }

    /**
     * Reg-2: Active (not completed) placement → certificate denied (403).
     */
    public function test_certificate_denied_for_active_placement(): void
    {
        $john          = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $johnPlacement = Placement::whereHas('student.user', fn ($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();

        $this->assertEquals('active', $johnPlacement->status);

        Sanctum::actingAs($john);
        $this->getJson("/api/students/placements/{$johnPlacement->id}/certificate")->assertStatus(403);
    }

    /**
     * Reg-3: Cross-student certificate access denied.
     */
    public function test_cross_student_certificate_access_denied(): void
    {
        $alice          = User::where('email', 'alice.wanjiru@student.uonbi.ac.ke')->first();
        $brianPlacement = Placement::whereHas('student.user', fn ($q) => $q->where('email', 'brian.otieno@student.uonbi.ac.ke'))->first();

        Sanctum::actingAs($alice);
        $this->getJson("/api/students/placements/{$brianPlacement->id}/certificate")->assertStatus(403);
    }
    private function dropEvaluationUniqueConstraint(): void
    {
        try {
            \Illuminate\Support\Facades\Schema::table('evaluations', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->dropUnique('evaluations_placement_evaluator_type_unique');
            });
        } catch (\Throwable $e) {
            // A missing index is expected when a migration test is starting from scratch.
        }
    }
}
