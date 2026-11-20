<?php

namespace App\Policies;

use App\Models\Placement;
use App\Models\User;

class PlacementPolicy
{
    public function view(User $user, Placement $placement): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Student owner
        if ($user->isStudent() && $placement->student && $placement->student->user_id === $user->id) {
            return true;
        }

        // Assigned academic supervisor
        if ($user->isAcademicSupervisor() && $placement->academic_supervisor_id === $user->id) {
            return true;
        }

        // Assigned company supervisor
        if ($user->isCompanySupervisor() && $placement->company_supervisor_id === $user->companySupervisor?->id) {
            return true;
        }

        // Institution Admin of the student
        if ($user->isInstitutionAdmin() && $placement->student) {
            return $placement->student->institution_id === $user->institution_id;
        }

        // Company manager
        if ($user->isCompany() && $placement->company_id === $user->getCompanyId()) {
            return true;
        }

        return false;
    }

    public function approve(User $user, Placement $placement): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isInstitutionAdmin() && $placement->student) {
            return $placement->student->institution_id === $user->institution_id;
        }

        return false;
    }

    public function grade(User $user, Placement $placement): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isAcademicSupervisor() && $placement->academic_supervisor_id === $user->id) {
            return true;
        }

        if ($user->isInstitutionAdmin() && $placement->student) {
            return $placement->student->institution_id === $user->institution_id;
        }

        return false;
    }

    public function certificate(User $user, Placement $placement): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isStudent() && $placement->student && $placement->student->user_id === $user->id) {
            return true;
        }

        if ($user->isInstitutionAdmin() && $placement->student) {
            return $placement->student->institution_id === $user->institution_id;
        }

        return false;
    }
}
