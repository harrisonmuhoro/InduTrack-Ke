<?php

namespace Tests\Feature\Security\Phase4;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Document;
use App\Models\Placement;
use App\Models\LogbookEntry;
use App\Models\FieldVisit;
use App\Models\Application;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\Storage;

/**
 * Phase 4 — Workstream C: Insecure Direct Object Reference (IDOR) & Record Ownership
 *
 * Verifies that manipulating resource IDs in URLs/requests does not grant access
 * to other users' resources across:
 * - Student profiles
 * - Documents
 * - Placements & Certificates
 * - Logbook entries & resubmissions
 * - Field visits
 * - Messages & threads
 */
class IdorProtectionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    public function test_student_cannot_download_another_students_document_via_id_tampering(): void
    {
        Storage::fake('local');

        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $david = User::where('email', 'david.kamau@student.strathmore.edu')->first();
        $davidStudent = Student::where('user_id', $david->id)->first();

        // Create a document belonging to David
        Storage::disk('local')->put("documents/{$davidStudent->id}/secret_cert.pdf", 'David secret content');
        $davidDoc = Document::create([
            'student_id'    => $davidStudent->id,
            'type'          => 'medical_cert',
            'original_name' => 'secret_cert.pdf',
            'file_path'     => "documents/{$davidStudent->id}/secret_cert.pdf",
            'mime_type'     => 'application/pdf',
            'file_size'     => 1024,
            'status'        => 'pending',
        ]);

        // John attempts to download David's document using David's document ID -> 403 Forbidden
        Sanctum::actingAs($john);
        $res = $this->getJson("/api/documents/{$davidDoc->id}/download");
        $res->assertStatus(403);
    }

    public function test_student_cannot_edit_another_students_logbook_entry(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $alice = User::where('email', 'alice.wanjiru@student.uonbi.ac.ke')->first();

        $alicePlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', $alice->email))->first();
        $this->assertNotNull($alicePlacement);

        // Find or create an editable entry for Alice
        $aliceEntry = LogbookEntry::create([
            'placement_id' => $alicePlacement->id,
            'entry_date'   => now()->toDateString(),
            'week_number'  => 55,
            'activities'   => 'Alice legitimate work',
            'status'       => 'draft',
        ]);

        // John attempts to PUT to Alice's logbook entry -> 403 Forbidden
        Sanctum::actingAs($john);
        $res = $this->putJson("/api/logbooks/{$aliceEntry->id}", [
            'activities' => 'Tampered activities by John',
        ]);
        $res->assertStatus(403);

        // Database remains unmutated
        $aliceEntry->refresh();
        $this->assertEquals('Alice legitimate work', $aliceEntry->activities);
    }

    public function test_student_cannot_resubmit_another_students_rejected_entry(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $alice = User::where('email', 'alice.wanjiru@student.uonbi.ac.ke')->first();

        $alicePlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', $alice->email))->first();

        $aliceRejectedEntry = LogbookEntry::create([
            'placement_id'        => $alicePlacement->id,
            'entry_date'          => now()->toDateString(),
            'week_number'         => 56,
            'activities'          => 'Alice rejected entry',
            'status'              => 'rejected',
            'correction_deadline' => now()->addHours(72),
        ]);

        // John attempts to resubmit Alice's entry -> 403 Forbidden
        Sanctum::actingAs($john);
        $res = $this->postJson("/api/logbooks/{$aliceRejectedEntry->id}/resubmit");
        $res->assertStatus(403);

        $aliceRejectedEntry->refresh();
        $this->assertEquals('rejected', $aliceRejectedEntry->status);
    }

    public function test_student_cannot_download_another_students_completion_certificate(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $brian = User::where('email', 'brian.otieno@student.uonbi.ac.ke')->first();

        $brianPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', $brian->email))
            ->where('status', 'completed')
            ->first();
        $this->assertNotNull($brianPlacement);

        // John attempts to generate/download Brian's certificate -> 403 Forbidden
        Sanctum::actingAs($john);
        $res = $this->getJson("/api/students/placements/{$brianPlacement->id}/certificate");
        $res->assertStatus(403);
    }

    public function test_academic_supervisor_cannot_update_another_supervisors_field_visit(): void
    {
        $drAlan = User::where('email', 'supervisor@uonbi.ac.ke')->first();
        $drWanjiku = User::where('email', 'wanjiku@uonbi.ac.ke')->first();

        $brianPlacement = Placement::whereHas('student.user', fn($q) => $q->where('email', 'brian.otieno@student.uonbi.ac.ke'))->first();

        // Field visit created by Dr. Wanjiku
        $visit = FieldVisit::create([
            'academic_supervisor_id' => $drWanjiku->id,
            'placement_id'           => $brianPlacement->id,
            'visit_date'             => now()->addDays(3)->toDateString(),
            'status'                 => 'scheduled',
        ]);

        // Dr. Alan attempts to modify Dr. Wanjiku's field visit -> 403 Forbidden
        Sanctum::actingAs($drAlan);
        $res = $this->putJson("/api/field-visits/{$visit->id}", [
            'company_environment_notes' => 'Tampered notes by another supervisor',
        ]);
        $res->assertStatus(403);

        $visit->refresh();
        $this->assertNull($visit->company_environment_notes);
    }

    public function test_user_cannot_access_unauthorized_message_thread_via_id_tampering(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $david = User::where('email', 'david.kamau@student.strathmore.edu')->first();
        $markKcb = User::where('email', 'mark@kcbgroup.com')->first();

        // John has no placement relationship with Mark (KCB supervisor assigned to Alice)
        Sanctum::actingAs($john);
        $res = $this->getJson("/api/messages/thread/{$markKcb->id}");
        $res->assertStatus(403);

        // John also cannot message David (student at another university with no relationship)
        $resDavid = $this->getJson("/api/messages/thread/{$david->id}");
        $resDavid->assertStatus(403);
    }
}
