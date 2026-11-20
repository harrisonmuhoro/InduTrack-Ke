<?php

namespace Tests\Feature\Security\Phase4;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Institution;
use App\Models\Placement;
use App\Models\AttachmentSlot;
use App\Models\Role;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\DB;

/**
 * Phase 4 — Workstreams A & B: Role-Based Authorization & Privilege Escalation
 *
 * Covers:
 * 1. Unauthenticated requests to protected endpoints return 401.
 * 2. Canonical roles accessing forbidden endpoints return 403.
 * 3. Privilege escalation attempts via request parameters fail without mutating data.
 * 4. Forged ownership or role fields are ignored or rejected.
 */
class RoleAuthorizationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    // ── 1. Unauthenticated Access ─────────────────────────────────────────────

    public function test_unauthenticated_requests_are_rejected_with_401(): void
    {
        $endpoints = [
            ['GET',  '/api/profile'],
            ['GET',  '/api/students/applications'],
            ['GET',  '/api/students/placement'],
            ['GET',  '/api/companies/slots'],
            ['GET',  '/api/supervisors/students'],
            ['GET',  '/api/field-visits'],
            ['GET',  '/api/admin/dashboard'],
            ['GET',  '/api/admin/students'],
            ['GET',  '/api/admin/placements'],
            ['GET',  '/api/superadmin/dashboard'],
            ['GET',  '/api/superadmin/users'],
            ['POST', '/api/messages'],
        ];

        foreach ($endpoints as [$method, $uri]) {
            $response = $this->json($method, $uri);
            $response->assertStatus(401);
        }
    }

    // ── 2. Cross-Role Boundary Enforcement (Negative Authorization) ──────────

    public function test_student_cannot_access_administrative_or_supervisor_endpoints(): void
    {
        $studentUser = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        Sanctum::actingAs($studentUser);

        // Student attempting institution admin endpoints -> 403
        $this->getJson('/api/admin/dashboard')->assertStatus(403);
        $this->getJson('/api/admin/students')->assertStatus(403);
        $this->getJson('/api/admin/compliance')->assertStatus(403);

        // Student attempting superadmin endpoints -> 403
        $this->getJson('/api/superadmin/dashboard')->assertStatus(403);
        $this->getJson('/api/superadmin/users')->assertStatus(403);

        // Student attempting company slot creation -> 403
        $this->postJson('/api/companies/slots', [
            'department' => 'Engineering',
            'capacity'   => 5,
        ])->assertStatus(403);

        // Student attempting academic supervisor field visit creation -> 403
        $placement = Placement::where('status', 'active')->first();
        $this->postJson('/api/field-visits', [
            'placement_id' => $placement->id,
            'visit_date'   => now()->addDays(5)->toDateString(),
        ])->assertStatus(403);

        // Student attempting academic review -> 403
        $this->postJson("/api/logbooks/1/review", ['action' => 'approved'])->assertStatus(403);

        // Student attempting weekly supervisor log -> 403
        $this->postJson('/api/supervisors/weekly-logs', [
            'placement_id'     => $placement->id,
            'week_number'      => 1,
            'conduct_score'    => 5,
            'attendance_score' => 5,
        ])->assertStatus(403);
    }

    public function test_company_supervisor_cannot_access_company_manager_actions(): void
    {
        $compSup = User::where('email', 'jane.smith@safaricom.co.ke')->first();
        Sanctum::actingAs($compSup);

        // Company supervisor cannot create slots (strictly company manager or superadmin)
        $res = $this->postJson('/api/companies/slots', [
            'department' => 'Unauthorized Dept',
            'capacity'   => 2,
        ]);
        $res->assertStatus(403);

        // Company supervisor cannot perform formal academic reviews
        $this->postJson('/api/logbooks/1/review', ['action' => 'approved'])->assertStatus(403);

        // Company supervisor cannot access institution admin dashboard
        $this->getJson('/api/admin/dashboard')->assertStatus(403);

        // Company supervisor cannot access superadmin dashboard
        $this->getJson('/api/superadmin/dashboard')->assertStatus(403);
    }

    public function test_academic_supervisor_cannot_access_superadmin_or_company_actions(): void
    {
        $acadSup = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        Sanctum::actingAs($acadSup);

        // Cannot create company slots
        $this->postJson('/api/companies/slots', [
            'department' => 'IT',
            'capacity'   => 1,
        ])->assertStatus(403);

        // Cannot access superadmin endpoints
        $this->getJson('/api/superadmin/institutions')->assertStatus(403);
        $this->getJson('/api/superadmin/users')->assertStatus(403);

        // Cannot submit company weekly logs (strictly company supervisor)
        $placement = Placement::where('academic_supervisor_id', $acadSup->id)->first();
        $this->assertNotNull($placement);
        $this->postJson('/api/supervisors/weekly-logs', [
            'placement_id'     => $placement->id,
            'week_number'      => 1,
            'conduct_score'    => 5,
            'attendance_score' => 5,
        ])->assertStatus(403);
    }

    public function test_institution_admin_cannot_access_superadmin_endpoints(): void
    {
        $instAdmin = User::where('email', 'admin@uonbi.ac.ke')->first();
        Sanctum::actingAs($instAdmin);

        $this->getJson('/api/superadmin/dashboard')->assertStatus(403);
        $this->getJson('/api/superadmin/institutions')->assertStatus(403);
        $this->getJson('/api/superadmin/audit-logs')->assertStatus(403);

        // Institution admin cannot globally verify or blacklist companies (superadmin only)
        $this->putJson('/api/admin/companies/1/verify')->assertStatus(403);
        $this->putJson('/api/admin/companies/1/blacklist', ['reason' => 'test'])->assertStatus(403);
    }

    // ── 3. Privilege Escalation & Parameter Tampering ─────────────────────────

    public function test_user_cannot_escalate_role_via_profile_update(): void
    {
        $studentUser = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        Sanctum::actingAs($studentUser);

        $initialRoles = $studentUser->roles->pluck('name')->toArray();

        // Attempting to send role or administrative fields in profile update
        $res = $this->putJson('/api/profile', [
            'name'           => 'John Tampered',
            'role'           => 'super_admin',
            'roles'          => ['super_admin'],
            'institution_id' => 999,
            'company_id'     => 888,
        ]);
        $res->assertStatus(200);

        $studentUser->refresh();
        $this->assertEquals('John Tampered', $studentUser->name);
        $this->assertEquals($initialRoles, $studentUser->roles->pluck('name')->toArray(), 'Role must not be escalated via profile payload');
        $this->assertNotEquals(888, $studentUser->company_id, 'company_id must not be injected via profile payload');
    }

    public function test_non_superadmin_cannot_reassign_user_roles(): void
    {
        $instAdmin = User::where('email', 'admin@uonbi.ac.ke')->first();
        $student = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();

        Sanctum::actingAs($instAdmin);

        // Institution admin attempting to invoke superadmin role change endpoint -> 403
        $res = $this->putJson("/api/superadmin/users/{$student->id}/role", [
            'role' => 'institution_admin',
        ]);
        $res->assertStatus(403);

        // Confirm database state did NOT change
        $this->assertFalse($student->fresh()->hasRole('institution_admin'));
    }
}
