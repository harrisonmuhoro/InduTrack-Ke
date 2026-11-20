<?php

namespace App\Http\Controllers;

use App\Models\FieldVisit;
use App\Models\Placement;
use Illuminate\Http\Request;

class FieldVisitController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return response()->json(FieldVisit::with('placement.student.user', 'placement.company')->latest('visit_date')->get());
        }

        $visits = FieldVisit::with('placement.student.user', 'placement.company')
            ->where('academic_supervisor_id', $user->id)
            ->latest('visit_date')
            ->get();

        return response()->json($visits);
    }

    public function store(Request $request)
    {
        $request->validate([
            'placement_id'  => 'required|exists:placements,id',
            'visit_date'    => 'required|date',
            'visit_time'    => 'nullable|date_format:H:i',
        ]);

        $user = $request->user();
        $placement = Placement::findOrFail($request->placement_id);

        // Enforce assignment: only assigned academic supervisor or super admin
        if (!$user->isSuperAdmin() && $placement->academic_supervisor_id !== $user->id) {
            return response()->json(['message' => 'Forbidden. Only the assigned academic supervisor can schedule field visits.'], 403);
        }

        $visit = FieldVisit::create([
            'academic_supervisor_id' => $user->id,
            'placement_id'           => $request->placement_id,
            'visit_date'             => $request->visit_date,
            'visit_time'             => $request->visit_time,
            'status'                 => 'scheduled',
        ]);

        return response()->json($visit->load('placement.student.user'), 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'status'                      => 'nullable|in:scheduled,completed,cancelled',
            'company_environment_notes'   => 'nullable|string',
            'student_performance_notes'   => 'nullable|string',
            'recommendations'             => 'nullable|string',
            'gps_latitude'                => 'nullable|string',
            'gps_longitude'               => 'nullable|string',
        ]);

        $user = $request->user();
        $visit = FieldVisit::findOrFail($id);

        if (!$user->isSuperAdmin() && $visit->academic_supervisor_id !== $user->id) {
            return response()->json(['message' => 'Forbidden. Only the conducting academic supervisor can update this report.'], 403);
        }

        $visit->update($request->only([
            'status', 'company_environment_notes',
            'student_performance_notes', 'recommendations',
            'gps_latitude', 'gps_longitude',
        ]));

        return response()->json($visit);
    }

    public function show(Request $request, $id)
    {
        $visit = FieldVisit::with('placement.student.user', 'placement.company')->findOrFail($id);
        $user = $request->user();

        $isAcademic = ($visit->academic_supervisor_id === $user->id);
        $isInstAdmin = ($user->isInstitutionAdmin() && $visit->placement?->student?->institution_id === $user->institution_id);

        if (!$user->isSuperAdmin() && !$isAcademic && !$isInstAdmin) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($visit);
    }
}
