<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Placement;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;

class CertificateController extends Controller
{
    public function generate(Request $request, $placementId)
    {
        $placement = Placement::with([
            'student.user',
            'company',
            'companySupervisor.user',
            'academicSupervisor',
            'evaluations',
        ])->findOrFail($placementId);

        $user = $request->user();

        // Authorization: student owner, institution admin of student's institution, or superadmin
        $isStudent   = ($placement->student?->user_id === $user->id);
        $isInstAdmin = ($user->isInstitutionAdmin()
            && $user->institution_id
            && $placement->student?->institution_id === $user->institution_id);

        if (!$user->isSuperAdmin() && !$isStudent && !$isInstAdmin) {
            return response()->json(['message' => 'Forbidden. Unauthorized to access this certificate.'], 403);
        }

        // ── Remediation C: Strict certificate eligibility ──────────────────────
        // Reject if placement is not completed
        if ($placement->status !== 'completed') {
            return response()->json(['message' => 'Certificate not available. Attachment must be completed.'], 403);
        }

        // Require both evaluator types to have submitted
        $hasCompanyEval  = $placement->evaluations()
            ->where('evaluator_type', 'company_supervisor')
            ->whereNotNull('submitted_at')
            ->exists();

        $hasAcademicEval = $placement->evaluations()
            ->where('evaluator_type', 'academic_supervisor')
            ->whereNotNull('submitted_at')
            ->exists();

        if (!$hasCompanyEval) {
            return response()->json(['message' => 'Certificate not available. Company supervisor evaluation is missing.'], 403);
        }

        if (!$hasAcademicEval) {
            return response()->json(['message' => 'Certificate not available. Academic supervisor evaluation is missing.'], 403);
        }

        // ── Score calculation ──────────────────────────────────────────────────
        $companyEval = $placement->evaluations()
            ->where('evaluator_type', 'company_supervisor')
            ->whereNotNull('submitted_at')
            ->first();
        $academicEval = $placement->evaluations()
            ->where('evaluator_type', 'academic_supervisor')
            ->whereNotNull('submitted_at')
            ->first();

        // Company score normalized to 100%
        $companyPercentage = $companyEval?->total_score
            ? ($companyEval->total_score / 5) * 100
            : 0;

        // Academic score already 0–100
        $academicScore = $placement->academic_grade ?? ($academicEval?->total_score
            ? ($academicEval->total_score / 5) * 100
            : 0);

        // Final score: 50% Company + 50% Academic
        $finalScore = ($companyPercentage * 0.5) + ($academicScore * 0.5);

        $html = "
            <h1 style='text-align:center;'>Certificate of Completion</h1>
            <p style='text-align:center;'>This is to certify that</p>
            <h2 style='text-align:center;'>{$placement->student->user->name}</h2>
            <p style='text-align:center;'>has successfully completed an industrial attachment at</p>
            <h3 style='text-align:center;'>{$placement->company->name}</h3>
            <p style='text-align:center;'>Overall Performance Score: <strong>" . round($finalScore, 1) . "%</strong></p>
            <p style='text-align:center; margin-top:50px;'>Date of Issue: " . now()->format('F j, Y') . "</p>
        ";

        $pdf = Pdf::loadHTML($html);
        return $pdf->download("Certificate_{$placement->student->reg_number}.pdf");
    }
}
