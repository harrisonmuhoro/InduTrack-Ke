<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Student;
use App\Models\AttachmentSlot;
use App\Models\Placement;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use App\Notifications\ApplicationStatusUpdated;

class ApplicationController extends Controller
{
    public function apply(Request $request)
    {
        $request->validate([
            'slot_id'      => 'required|exists:attachment_slots,id',
            'cover_letter' => 'nullable|string',
        ]);

        $student = Student::where('user_id', $request->user()->id)->firstOrFail();

        // Prevent duplicate application for the same slot
        $existingApp = Application::where('student_id', $student->id)
            ->where('slot_id', $request->slot_id)
            ->first();

        if ($existingApp) {
            return response()->json(['message' => 'You have already applied for this slot.'], 422);
        }

        // Prevent application if student already has an active placement
        $activePlacement = Placement::where('student_id', $student->id)
            ->where('status', 'active')
            ->first();

        if ($activePlacement) {
            return response()->json(['message' => 'You already have an active placement.'], 422);
        }

        $application = Application::create([
            'student_id'   => $student->id,
            'slot_id'      => $request->slot_id,
            'status'       => 'submitted',
            'cover_letter' => $request->cover_letter,
        ]);

        return response()->json($application, 201);
    }

    public function studentApplications(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();
        return response()->json($student->applications()->with('slot.company')->get());
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:shortlisted,accepted,rejected']);
        $application = Application::with(['student.user', 'slot.company'])->findOrFail($id);
        $user = $request->user();

        // Enforce policy — company owning slot may update; institution admin of student may update
        $this->authorize('updateStatus', $application);

        $application->update(['status' => $request->status]);

        // Send notification
        if ($application->student?->user) {
            $application->student->user->notify(new ApplicationStatusUpdated($application));
        }

        return response()->json($application);
    }

    public function generateOfferLetter(Request $request, $id)
    {
        $application = Application::with('student.user', 'slot.company')->findOrFail($id);
        $user = $request->user();

        // Enforce policy
        $this->authorize('generateOffer', $application);

        $data = [
            'studentName' => $application->student->user->name ?? 'Student',
            'companyName' => $application->slot->company->name ?? 'Company',
            'department'  => $application->slot->department ?? 'General',
            'date'        => now()->format('Y-m-d'),
        ];

        $html = "
            <h1>Offer Letter</h1>
            <p>Date: {$data['date']}</p>
            <p>Dear {$data['studentName']},</p>
            <p>We are pleased to offer you an attachment slot at <strong>{$data['companyName']}</strong> in the <strong>{$data['department']}</strong> department.</p>
            <p>Please accept this offer through the portal within 5 days.</p>
            <br>
            <p>Sincerely,</p>
            <p>Human Resources, {$data['companyName']}</p>
        ";

        $pdf = Pdf::loadHTML($html);
        return $pdf->download('offer_letter.pdf');
    }
}
