<?php

namespace App\Http\Controllers;

use App\Models\CompanySupervisor;
use App\Models\InstitutionSupervisor;
use App\Models\Placement;
use App\Models\WeeklyLog;
use App\Models\StudentFlag;
use Illuminate\Http\Request;

class SupervisorController extends Controller
{
    /**
     * Get placements assigned to this supervisor (company or academic).
     */
    public function assignedStudents(Request $request)
    {
        $userId = $request->user()->id;

        // Company supervisor
        $companySupervisor = CompanySupervisor::where('user_id', $userId)->first();
        if ($companySupervisor) {
            $placements = Placement::with('student.user', 'company')
                ->where('company_supervisor_id', $companySupervisor->id)
                ->get();
            return response()->json($placements);
        }

        // Institution / academic supervisor
        $placements = Placement::with('student.user', 'company')
            ->where('academic_supervisor_id', $userId)
            ->get();

        return response()->json($placements);
    }

    /**
     * View logbook entries for a specific placement.
     */
    public function viewLogbook(Request $request, $placementId)
    {
        $placement = Placement::with([
            'student.user',
            'logbookEntries.comments.user',
        ])->findOrFail($placementId);

        return response()->json($placement);
    }

    /**
     * Submit a weekly performance log for a student.
     */
    public function submitWeeklyLog(Request $request)
    {
        $request->validate([
            'placement_id'     => 'required|exists:placements,id',
            'week_number'      => 'required|integer|min:1',
            'tasks_assigned'   => 'nullable|string',
            'tasks_completed'  => 'nullable|string',
            'conduct_score'    => 'required|integer|min:1|max:5',
            'attendance_score' => 'required|integer|min:1|max:5',
            'specific_feedback'=> 'nullable|string',
            'has_concern'      => 'boolean',
            'concern_details'  => 'nullable|string',
        ]);

        $supervisor = CompanySupervisor::where('user_id', $request->user()->id)->firstOrFail();

        // Prevent duplicate weekly log
        $existing = WeeklyLog::where('placement_id', $request->placement_id)
            ->where('week_number', $request->week_number)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Weekly log for this week already submitted.'], 422);
        }

        $log = WeeklyLog::create([
            'placement_id'       => $request->placement_id,
            'company_supervisor_id' => $supervisor->id,
            'week_number'        => $request->week_number,
            'tasks_assigned'     => $request->tasks_assigned,
            'tasks_completed'    => $request->tasks_completed,
            'conduct_score'      => $request->conduct_score,
            'attendance_score'   => $request->attendance_score,
            'specific_feedback'  => $request->specific_feedback,
            'has_concern'        => $request->has_concern ?? false,
            'concern_details'    => $request->concern_details,
        ]);

        // Auto-flag if concern raised
        if ($request->has_concern && $request->concern_details) {
            StudentFlag::create([
                'placement_id' => $request->placement_id,
                'flagged_by'   => $request->user()->id,
                'severity'     => 'warning',
                'reason'       => 'weekly_concern',
                'details'      => $request->concern_details,
            ]);
        }

        return response()->json($log, 201);
    }

    /**
     * Get weekly logs for a placement.
     */
    public function weeklyLogs(Request $request, $placementId)
    {
        $logs = WeeklyLog::where('placement_id', $placementId)
            ->orderBy('week_number')
            ->get();
        return response()->json($logs);
    }

    /**
     * Flag a student (disciplinary or concern).
     */
    public function flagStudent(Request $request)
    {
        $request->validate([
            'placement_id' => 'required|exists:placements,id',
            'severity'     => 'required|in:warning,flag,critical',
            'reason'       => 'required|string',
            'details'      => 'nullable|string',
        ]);

        $flag = StudentFlag::create([
            'placement_id' => $request->placement_id,
            'flagged_by'   => $request->user()->id,
            'severity'     => $request->severity,
            'reason'       => $request->reason,
            'details'      => $request->details,
        ]);

        return response()->json($flag, 201);
    }
}
