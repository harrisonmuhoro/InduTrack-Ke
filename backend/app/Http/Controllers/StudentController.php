<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\AttachmentSlot;
use App\Models\Application;
use App\Models\Placement;
use Illuminate\Http\Request;

class StudentController extends Controller
{


    public function searchSlots(Request $request)
    {
        $query = AttachmentSlot::with('company')->where('status', 'open');

        if ($request->department) {
            $query->where('department', 'like', '%' . $request->department . '%');
        }
        if ($request->county) {
            $query->whereHas('company', fn($q) => $q->where('county', $request->county));
        }
        if ($request->stipend) {
            $query->where('has_stipend', true);
        }

        return response()->json($query->latest()->get());
    }

    public function myApplications(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) return response()->json([]);

        return response()->json(
            Application::with(['slot.company'])
                ->where('student_id', $student->id)
                ->latest()
                ->get()
        );
    }

    public function activePlacement(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) return response()->json(null);

        $placement = Placement::with([
            'company',
            'companySupervisor.user',
            'academicSupervisor',
            'logbookEntries',
        ])
        ->where('student_id', $student->id)
        ->where('status', 'active')
        ->first();

        return response()->json($placement);
    }

    public function smartMatch(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) return response()->json([]);

        $recommendedSlots = AttachmentSlot::with('company')
            ->where('status', 'open')
            ->where('department', 'like', '%' . ($student->department ?? '') . '%')
            ->get();
        return response()->json($recommendedSlots);
    }
}
