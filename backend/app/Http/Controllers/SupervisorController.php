<?php

namespace App\Http\Controllers;

use App\Models\CompanySupervisor;
use App\Models\InstitutionSupervisor;
use App\Models\Placement;
use App\Models\WeeklyLog;
use App\Models\StudentFlag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Database\UniqueConstraintViolationException;

class SupervisorController extends Controller
{
    /**
     * Get placements assigned to this supervisor (company or academic).
     */
    public function assignedStudents(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return response()->json(Placement::with('student.user', 'company')->get());
        }

        // Company supervisor
        if ($user->isCompanySupervisor()) {
            $companySupervisor = CompanySupervisor::where('user_id', $user->id)->first();
            if ($companySupervisor) {
                $placements = Placement::with('student.user', 'company', 'weeklyLogs')
                    ->where('company_supervisor_id', $companySupervisor->id)
                    ->get();
                return response()->json($placements);
            }
            return response()->json([]);
        }

        // Institution / academic supervisor
        $placements = Placement::with('student.user', 'company', 'fieldVisits')
            ->where('academic_supervisor_id', $user->id)
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
            'logbookEntries.reviewHistory.reviewer:id,name',
            'logbookEntries.reviewHistory.actor:id,name',
        ])->findOrFail($placementId);

        // Enforce policy authorization (PlacementPolicy::view)
        $this->authorize('view', $placement);

        return response()->json($placement);
    }

    /**
     * Submit a weekly performance log for a student (Company Supervisor only).
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
            'concern_details'  => 'required_if:has_concern,true|nullable|string',
        ]);

        $user = $request->user();
        $placement = Placement::findOrFail($request->placement_id);

        // Explicit active placement validation
        if (!in_array($placement->status, ['active', 'completed'])) {
            return response()->json(['message' => 'Cannot submit performance log for a non-active placement.'], 422);
        }

        $supervisor = CompanySupervisor::where('user_id', $user->id)->first();

        if (!$supervisor && !$user->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden. Only company supervisors can submit weekly performance logs.'], 403);
        }

        // Enforce supervisor assignment
        if (!$user->isSuperAdmin() && $placement->company_supervisor_id !== $supervisor?->id) {
            return response()->json(['message' => 'Forbidden. You are not the assigned company supervisor for this placement.'], 403);
        }

        // Fallback for superadmin: resolve the company supervisor ID assigned to this placement
        $resolvedSupervisorId = $supervisor ? $supervisor->id : $placement->company_supervisor_id;
        if (!$resolvedSupervisorId) {
            return response()->json(['message' => 'Cannot submit weekly log: placement has no assigned company supervisor.'], 422);
        }

        // Prevent duplicate weekly log
        $existing = WeeklyLog::where('placement_id', $request->placement_id)
            ->where('week_number', $request->week_number)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Weekly log for this week already submitted.'], 409);
        }

        try {
            $log = DB::transaction(function () use ($request, $user, $resolvedSupervisorId, $placement) {
                $weeklyLog = WeeklyLog::create([
                    'placement_id'          => $request->placement_id,
                    'company_supervisor_id' => $resolvedSupervisorId,
                    'week_number'           => $request->week_number,
                    'tasks_assigned'        => $request->tasks_assigned,
                    'tasks_completed'       => $request->tasks_completed,
                    'conduct_score'         => $request->conduct_score,
                    'attendance_score'      => $request->attendance_score,
                    'specific_feedback'     => $request->specific_feedback,
                    'has_concern'           => $request->has_concern ?? false,
                    'concern_details'       => $request->concern_details,
                ]);

                // Atomically create student flag if concern is raised
                if ($request->has_concern && $request->concern_details) {
                    StudentFlag::create([
                        'placement_id' => $request->placement_id,
                        'flagged_by'   => $user->id,
                        'severity'     => 'warning',
                        'reason'       => 'weekly_concern',
                        'details'      => $request->concern_details,
                    ]);
                }

                return $weeklyLog;
            });
        } catch (UniqueConstraintViolationException $e) {
            return response()->json(['message' => 'Weekly log for this week already submitted.'], 409);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'weekly_logs_placement_week_unique')) {
                return response()->json(['message' => 'Weekly log for this week already submitted.'], 409);
            }
            throw $e;
        }

        return response()->json($log, 201);
    }

    /**
     * Get weekly logs for a placement.
     */
    public function weeklyLogs(Request $request, $placementId)
    {
        $placement = Placement::with('student')->findOrFail($placementId);

        // Enforce policy authorization
        if (Gate::denies('view', $placement)) {
            return response()->json(['message' => 'Forbidden. Cannot view logs for unassigned placement.'], 403);
        }

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

        $placement = Placement::with('student')->findOrFail($request->placement_id);
        $user = $request->user();

        $isAcademic = ($placement->academic_supervisor_id === $user->id);
        $isCompany = ($user->companySupervisor && $placement->company_supervisor_id === $user->companySupervisor->id);
        $isInstAdmin = ($user->isInstitutionAdmin() && $placement->student?->institution_id === $user->institution_id);

        if (!$user->isSuperAdmin() && !$isAcademic && !$isCompany && !$isInstAdmin) {
            return response()->json(['message' => 'Forbidden. Cannot flag unassigned student.'], 403);
        }

        $flag = StudentFlag::create([
            'placement_id' => $request->placement_id,
            'flagged_by'   => $user->id,
            'severity'     => $request->severity,
            'reason'       => $request->reason,
            'details'      => $request->details,
        ]);

        return response()->json($flag, 201);
    }
}
