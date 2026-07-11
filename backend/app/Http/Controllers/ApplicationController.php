<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Student;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use App\Notifications\ApplicationStatusUpdated;

class ApplicationController extends Controller
{
    public function apply(Request $request)
    {
        $request->validate([
            'slot_id' => 'required|exists:attachment_slots,id',
            'cover_letter' => 'nullable|string',
        ]);

        $student = Student::where('user_id', $request->user()->id)->firstOrFail();

        $application = Application::create([
            'student_id' => $student->id,
            'slot_id' => $request->slot_id,
            'status' => 'submitted',
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
        $application = Application::with('student.user')->findOrFail($id);
        $application->update(['status' => $request->status]);

        // Send notification
        $application->student->user->notify(new ApplicationStatusUpdated($application));

        if ($request->status === 'accepted') {
            // Generate offer letter PDF logic would typically queue a job here
        }

        return response()->json($application);
    }

    public function generateOfferLetter(Request $request, $id)
    {
        $application = Application::with('student.user', 'slot.company')->findOrFail($id);
        
        $data = [
            'studentName' => $application->student->user->name,
            'companyName' => $application->slot->company->name,
            'department' => $application->slot->department,
            'date' => now()->format('Y-m-d'),
        ];

        // For this to work, we need a resources/views/pdf/offer_letter.blade.php
        // but we can load HTML directly for the demo
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
