<?php

namespace App\Http\Controllers;

use App\Models\Evaluation;
use App\Models\Placement;
use App\Models\Student;
use App\Models\CompanyRating;
use App\Models\Company;
use Illuminate\Http\Request;

class EvaluationController extends Controller
{
    /**
     * Company/Academic supervisor submits end-of-attachment evaluation.
     */
    public function store(Request $request)
    {
        $request->validate([
            'placement_id'        => 'required|exists:placements,id',
            'score_punctuality'   => 'required|integer|min:1|max:5',
            'score_attitude'      => 'required|integer|min:1|max:5',
            'score_technical'     => 'required|integer|min:1|max:5',
            'score_teamwork'      => 'required|integer|min:1|max:5',
            'score_communication' => 'required|integer|min:1|max:5',
            'remarks'             => 'nullable|string',
            'would_accept_again'  => 'required|boolean',
            'evaluator_type'      => 'required|in:company_supervisor,academic_supervisor',
        ]);

        // Prevent duplicate evaluations
        $existing = Evaluation::where('placement_id', $request->placement_id)
            ->where('evaluator_id', $request->user()->id)
            ->whereNotNull('submitted_at')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'You have already submitted an evaluation for this student.'], 422);
        }

        $scores = [
            $request->score_punctuality,
            $request->score_attitude,
            $request->score_technical,
            $request->score_teamwork,
            $request->score_communication,
        ];
        $total = round(array_sum($scores) / count($scores), 2);

        $evaluation = Evaluation::create([
            'placement_id'        => $request->placement_id,
            'evaluator_id'        => $request->user()->id,
            'evaluator_type'      => $request->evaluator_type,
            'score_punctuality'   => $request->score_punctuality,
            'score_attitude'      => $request->score_attitude,
            'score_technical'     => $request->score_technical,
            'score_teamwork'      => $request->score_teamwork,
            'score_communication' => $request->score_communication,
            'total_score'         => $total,
            'remarks'             => $request->remarks,
            'would_accept_again'  => $request->would_accept_again,
            'submitted_at'        => now(),
        ]);

        return response()->json($evaluation, 201);
    }

    /**
     * Get evaluations for a student's placement.
     */
    public function forStudent(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->firstOrFail();
        $placements = Placement::where('student_id', $student->id)->pluck('id');

        $evaluations = Evaluation::with('evaluator')
            ->whereIn('placement_id', $placements)
            ->whereNotNull('submitted_at')
            ->get();

        return response()->json($evaluations);
    }

    /**
     * Get evaluations for a given placement (admin/supervisor view).
     */
    public function forPlacement(Request $request, $placementId)
    {
        $evaluations = Evaluation::with('evaluator')
            ->where('placement_id', $placementId)
            ->whereNotNull('submitted_at')
            ->get();

        return response()->json($evaluations);
    }

    /**
     * Student rates a company (anonymous option).
     */
    public function rateCompany(Request $request, $companyId)
    {
        $request->validate([
            'rating'      => 'required|integer|min:1|max:5',
            'feedback'    => 'nullable|string',
            'is_anonymous'=> 'nullable|boolean',
        ]);

        $rating = CompanyRating::create([
            'company_id'   => $companyId,
            'rater_id'     => $request->user()->id,
            'rating'       => $request->rating,
            'feedback'     => $request->feedback,
            'is_anonymous' => $request->is_anonymous ?? false,
        ]);

        // Update aggregate rating on company
        $company = Company::findOrFail($companyId);
        $avgRating = $company->ratings()->avg('rating');
        $company->update(['rating' => round($avgRating, 2)]);

        return response()->json(['message' => 'Rating submitted successfully', 'rating' => $rating], 201);
    }
}
