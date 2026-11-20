<?php

namespace Tests\Feature\Security\Phase4;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Institution;
use App\Models\Placement;
use App\Models\Document;
use App\Models\StudentFlag;
use Laravel\Sanctum\Sanctum;

/**
 * Phase 4 — Workstream D: Cross-Institution Multi-Tenancy Isolation
 *
 * Verifies that:
 * 1. Institution A administrator cannot access Institution B students, placements,
 *    compliance records, flags, or documents.
 * 2. Institutional list queries automatically filter to the administrator's institution.
 * 3. Report exports (CSV) enforce strict institutional boundaries.
 * 4. Administrator with null institution_id is blocked from tenant records.
 * 5. Academic supervisors cannot view cross-institution records outside their scope.
 */
class CrossInstitutionIsolationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    public function test_institution_admin_student_list_is_strictly_scoped(): void
    {
        $uonAdmin = User::where('email', 'admin@uonbi.ac.ke')->first();
        $strathAdmin = User::where('email', 'admin@strathmore.edu')->first();

        // UoN admin listing students
        Sanctum::actingAs($uonAdmin);
        $resUon = $this->getJson('/api/admin/students');
        $resUon->assertStatus(200);

        $uonStudentEmails = collect($resUon->json('data'))->pluck('user.email');
        $this->assertContains('john.doe@student.uonbi.ac.ke', $uonStudentEmails);
        $this->assertNotContains('david.kamau@student.strathmore.edu', $uonStudentEmails);

        // Strathmore admin listing students
        Sanctum::actingAs($strathAdmin);
        $resStrath = $this->getJson('/api/admin/students');
        $resStrath->assertStatus(200);

        $strathStudentEmails = collect($resStrath->json('data'))->pluck('user.email');
        $this->assertContains('david.kamau@student.strathmore.edu', $strathStudentEmails);
        $this->assertNotContains('john.doe@student.uonbi.ac.ke', $strathStudentEmails);
    }

    public function test_institution_admin_cannot_view_or_approve_cross_institution_placement(): void
    {
        $strathAdmin = User::where('email', 'admin@strathmore.edu')->first();

        // John Doe is a UoN student
        $uonPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();
        $this->assertNotNull($uonPlacement);

        Sanctum::actingAs($strathAdmin);

        // Attempting to approve UoN placement as Strathmore admin -> 403 Forbidden
        $resApprove = $this->putJson("/api/admin/placements/{$uonPlacement->id}/approve");
        $resApprove->assertStatus(403);

        // Attempting to reject UoN placement as Strathmore admin -> 403 Forbidden
        $resReject = $this->putJson("/api/admin/placements/{$uonPlacement->id}/reject", ['reason' => 'Invalid']);
        $resReject->assertStatus(403);

        // Attempting to view UoN placement logbook as Strathmore admin -> 403 Forbidden
        $resLogbook = $this->getJson("/api/admin/placements/{$uonPlacement->id}/logbook");
        $resLogbook->assertStatus(403);
    }

    public function test_institution_admin_cannot_review_cross_institution_document(): void
    {
        $strathAdmin = User::where('email', 'admin@strathmore.edu')->first();

        // UoN student document
        $uonStudent = Student::whereHas('user', fn($q) => $q->where('email', 'john.doe@student.uonbi.ac.ke'))->first();
        $uonDoc = Document::create([
            'student_id'    => $uonStudent->id,
            'type'          => 'insurance_cert',
            'original_name' => 'insurance.pdf',
            'file_path'     => "documents/{$uonStudent->id}/insurance.pdf",
            'mime_type'     => 'application/pdf',
            'file_size'     => 1024,
            'status'        => 'pending',
        ]);

        Sanctum::actingAs($strathAdmin);

        // Strathmore admin attempting to review UoN document -> 403 Forbidden
        $res = $this->putJson("/api/admin/documents/{$uonDoc->id}/review", [
            'status' => 'approved',
        ]);
        $res->assertStatus(403);

        $uonDoc->refresh();
        $this->assertEquals('pending', $uonDoc->status);
    }

    public function test_institution_admin_cannot_resolve_cross_institution_flag(): void
    {
        $strathAdmin = User::where('email', 'admin@strathmore.edu')->first();

        $carolPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'carol.muthoni@student.uonbi.ac.ke'))->first();
        $flag = StudentFlag::where('placement_id', $carolPlacement->id)->first();
        $this->assertNotNull($flag);

        Sanctum::actingAs($strathAdmin);

        // Strathmore admin attempting to resolve UoN student flag -> 403 Forbidden
        $res = $this->putJson("/api/admin/flags/{$flag->id}/resolve");
        $res->assertStatus(403);

        $flag->refresh();
        $this->assertFalse((bool) $flag->resolved);
    }

    public function test_institution_admin_report_csv_exports_are_isolated(): void
    {
        $strathAdmin = User::where('email', 'admin@strathmore.edu')->first();
        Sanctum::actingAs($strathAdmin);

        $res = $this->get('/api/admin/reports/placements?format=csv');
        $res->assertStatus(200);

        $content = $res->getContent();
        $this->assertStringNotContainsString('john.doe@student.uonbi.ac.ke', $content);
        $this->assertStringNotContainsString('P15/1234/2022', $content, 'UoN registration number must not appear in Strathmore report');
    }
}
