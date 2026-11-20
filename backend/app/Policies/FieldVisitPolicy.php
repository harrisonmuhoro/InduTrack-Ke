<?php

namespace App\Policies;

use App\Models\FieldVisit;
use App\Models\Placement;
use App\Models\User;

class FieldVisitPolicy
{
    public function view(User $user, FieldVisit $visit): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Assigned academic supervisor
        if ($user->isAcademicSupervisor() && $visit->academic_supervisor_id === $user->id) {
            return true;
        }

        // Institution Admin of the student
        if ($user->isInstitutionAdmin() && $visit->placement?->student) {
            return $visit->placement->student->institution_id === $user->institution_id;
        }

        return false;
    }

    public function create(User $user, Placement $placement): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Only assigned academic supervisor can create field visit
        return $user->isAcademicSupervisor() && $placement->academic_supervisor_id === $user->id;
    }

    public function update(User $user, FieldVisit $visit): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Only assigned academic supervisor can update field visit report
        return $user->isAcademicSupervisor() && $visit->academic_supervisor_id === $user->id;
    }
}
