<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Placement;
use Barryvdh\DomPDF\Facade\Pdf;

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
        $isStudent   = ($placement->student?->user_id === $user->id);
        $isInstAdmin = ($user->isInstitutionAdmin() && $placement->student?->institution_id === $user->institution_id);

        if (!$user->isSuperAdmin() && !$isStudent && !$isInstAdmin) {
            return response()->json(['message' => 'Forbidden. Unauthorized to access this certificate.'], 403);
        }

        // Check if placement is complete and evaluations are submitted
        if ($placement->status !== 'completed' && $placement->evaluations->count() === 0) {
            return response()->json(['message' => 'Certificate not available yet. Attachment must be completed with evaluations.'], 403);
        }

        $companyAvg = $placement->evaluations->avg('total_score'); // out of 5
        $companyPercentage = $companyAvg ? ($companyAvg / 5) * 100 : 0;
        
        $academicScore = $placement->academic_grade ?? 0; // out of 100
        
        // Final score: 50% Company, 50% Academic (Or just average if both exist)
        if ($companyPercentage > 0 && $academicScore > 0) {
            $finalScore = ($companyPercentage * 0.5) + ($academicScore * 0.5);
        } else {
            $finalScore = max($companyPercentage, $academicScore);
        }

        $data = [
            'placement' => $placement,
            'student'   => $placement->student,
            'company'   => $placement->company,
            'score'     => round($finalScore, 1),
            'date'      => now()->format('F j, Y'),
        ];

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
