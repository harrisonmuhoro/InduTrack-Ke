<?php

namespace App\Http\Controllers;

use App\Models\FieldVisit;
use App\Models\Placement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class FieldVisitController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return response()->json(FieldVisit::with('placement.student.user', 'placement.company')->latest('visit_date')->get());
        }

        // Academic Supervisor: only assigned field visits
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

        // Enforce policy authorization (only assigned academic supervisor or superadmin)
        if (Gate::denies('create', [FieldVisit::class, $placement])) {
            return response()->json(['message' => 'Forbidden. Only the assigned academic supervisor can schedule field visits for this placement.'], 403);
        }

        $visit = FieldVisit::create([
            'academic_supervisor_id' => $user->id,
            'placement_id'           => $request->placement_id,
            'visit_date'             => $request->visit_date,
            'visit_time'             => $request->visit_time,
            'status'                 => 'scheduled',
        ]);

        return response()->json($visit->load('placement.student.user', 'placement.company'), 201);
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

        // Enforce policy authorization
        if (Gate::denies('update', $visit)) {
            return response()->json(['message' => 'Forbidden. Only the conducting academic supervisor can update this visit report.'], 403);
        }

        // Validate state transitions
        if ($request->has('status')) {
            if ($visit->status === 'completed' && $request->status !== 'completed') {
                return response()->json(['message' => 'Cannot alter status of an already completed field visit.'], 422);
            }
        }

        $visit->update($request->only([
            'status', 'company_environment_notes',
            'student_performance_notes', 'recommendations',
            'gps_latitude', 'gps_longitude',
        ]));

        return response()->json($visit->load('placement.student.user', 'placement.company'));
    }

    public function show(Request $request, $id)
    {
        $visit = FieldVisit::with('placement.student.user', 'placement.company')->findOrFail($id);

        // Enforce policy authorization
        if (Gate::denies('view', $visit)) {
            return response()->json(['message' => 'Forbidden. You do not have permission to view this field visit.'], 403);
        }

        return response()->json($visit);
    }
}
