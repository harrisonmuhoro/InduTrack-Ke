<?php

namespace App\Http\Controllers;

use App\Models\Evaluation;
use App\Models\Placement;
use App\Models\Student;
use App\Models\CompanyRating;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\UniqueConstraintViolationException;

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
            // evaluator_type is IGNORED from request; derived server-side
        ]);

        $user = $request->user();
        $placement = Placement::with(['student', 'companySupervisor'])->findOrFail($request->placement_id);

        // Derive evaluator type strictly from authenticated user's assigned role on this placement
        if ($user->isCompanySupervisor() && $placement->company_supervisor_id === $user->companySupervisor?->id) {
            $evaluatorType = 'company_supervisor';
        } elseif ($user->isAcademicSupervisor() && $placement->academic_supervisor_id === $user->id) {
            $evaluatorType = 'academic_supervisor';
        } elseif ($user->isSuperAdmin()) {
            // Super admin: must be explicit about which evaluator type
            if (!in_array($request->input('evaluator_type'), ['company_supervisor', 'academic_supervisor'])) {
                return response()->json(['message' => 'Super admin must specify a valid evaluator_type.'], 422);
            }
            $evaluatorType = $request->input('evaluator_type');
        } else {
            return response()->json(['message' => 'Forbidden. You are not assigned as an evaluator for this placement.'], 403);
        }

        if (!in_array($placement->status, ['active', 'completed'])) {
            return response()->json(['message' => 'Cannot evaluate a placement that is not active or completed.'], 422);
        }

        $scores = [
            $request->score_punctuality,
            $request->score_attitude,
            $request->score_technical,
            $request->score_teamwork,
            $request->score_communication,
        ];
        $total = round(array_sum($scores) / count($scores), 2);

        try {
            $evaluation = DB::transaction(function () use ($request, $placement, $user, $evaluatorType, $total) {
                return Evaluation::create([
                    'placement_id'        => $request->placement_id,
                    'evaluator_id'        => $user->id,
                    'evaluator_type'      => $evaluatorType,
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
            });
        } catch (UniqueConstraintViolationException $e) {
            return response()->json(['message' => 'An evaluation for this evaluator type has already been submitted for this placement.'], 422);
        } catch (\Illuminate\Database\QueryException $e) {
            // Only translate genuine duplicate-key violations for the evaluation unique constraint
            $message = $e->getMessage();
            $isDuplicateEvaluation = str_contains($message, 'evaluations_placement_evaluator_type_unique')
                || str_contains($message, 'evaluations.placement_id')
                || (str_contains($message, 'Duplicate entry') && str_contains($message, 'evaluations'));

            if ($isDuplicateEvaluation) {
                return response()->json(['message' => 'An evaluation for this evaluator type has already been submitted for this placement.'], 422);
            }

            // Re-throw genuine database failures (foreign key violations, connection issues, NOT NULL errors)
            throw $e;
        }

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
        $placement = Placement::with('student')->findOrFail($placementId);
        $user = $request->user();

        $isStudent = ($placement->student?->user_id === $user->id);
        $isAcademic = ($placement->academic_supervisor_id === $user->id);
        $isCompany = ($user->companySupervisor && $placement->company_supervisor_id === $user->companySupervisor->id);
        $isInstAdmin = ($user->isInstitutionAdmin() && $placement->student?->institution_id === $user->institution_id);

        if (!$user->isSuperAdmin() && !$isStudent && !$isAcademic && !$isCompany && !$isInstAdmin) {
            return response()->json(['message' => 'Forbidden. Cannot view evaluations for this placement.'], 403);
        }

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

        $user = $request->user();

        if (!$user->isSuperAdmin()) {
            $student = Student::where('user_id', $user->id)->first();
            if (!$student) {
                return response()->json(['message' => 'Forbidden. Only attached students can rate companies.'], 403);
            }

            $hasPlacement = Placement::where('student_id', $student->id)
                ->where('company_id', $companyId)
                ->exists();

            if (!$hasPlacement) {
                return response()->json(['message' => 'Forbidden. You can only rate companies where you have had a placement.'], 403);
            }
        }

        $rating = CompanyRating::create([
            'company_id'   => $companyId,
            'rater_id'     => $user->id,
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
