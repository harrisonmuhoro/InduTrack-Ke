<?php

namespace App\Policies;

use App\Models\Evaluation;
use App\Models\Placement;
use App\Models\User;

class EvaluationPolicy
{
    public function view(User $user, Evaluation $evaluation): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        $placement = $evaluation->placement;
        if (!$placement) {
            return false;
        }

        // Student on this placement
        if ($user->isStudent() && $placement->student && $placement->student->user_id === $user->id) {
            return true;
        }

        // The evaluator who submitted it
        if ($evaluation->evaluator_id === $user->id) {
            return true;
        }

        // Institution Admin of the student
        if ($user->isInstitutionAdmin() && $placement->student) {
            return $placement->student->institution_id === $user->institution_id;
        }

        return false;
    }

    /**
     * Determine whether user can submit evaluation for this placement.
     */
    public function create(User $user, Placement $placement, string $evaluatorType): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Must be an active or completed placement
        if (!in_array($placement->status, ['active', 'completed'])) {
            return false;
        }

        if ($evaluatorType === 'company_supervisor') {
            return $user->isCompanySupervisor()
                && $placement->company_supervisor_id === $user->companySupervisor?->id;
        }

        if ($evaluatorType === 'academic_supervisor') {
            return $user->isAcademicSupervisor()
                && $placement->academic_supervisor_id === $user->id;
        }

        return false;
    }
}
