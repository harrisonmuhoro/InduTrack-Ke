<?php

namespace App\Http\Controllers;

use App\Models\FieldVisit;
use App\Models\Placement;
use Illuminate\Http\Request;

class FieldVisitController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $visits = FieldVisit::with('placement.student.user', 'placement.company')
            ->where('academic_supervisor_id', $userId)
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

        $visit = FieldVisit::create([
            'academic_supervisor_id' => $request->user()->id,
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

        $visit = FieldVisit::where('academic_supervisor_id', $request->user()->id)
            ->findOrFail($id);

        $visit->update($request->only([
            'status', 'company_environment_notes',
            'student_performance_notes', 'recommendations',
            'gps_latitude', 'gps_longitude',
        ]));

        return response()->json($visit);
    }

    public function show(Request $request, $id)
    {
        $visit = FieldVisit::with('placement.student.user', 'placement.company')
            ->where('academic_supervisor_id', $request->user()->id)
            ->findOrFail($id);
        return response()->json($visit);
    }
}
