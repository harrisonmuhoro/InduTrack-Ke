<?php

namespace App\Policies;

use App\Models\Student;
use App\Models\User;

class StudentPolicy
{
    /**
     * Determine whether the user can view the student profile and records.
     */
    public function view(User $user, Student $student): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Student viewing own profile
        if ($student->user_id === $user->id) {
            return true;
        }

        // Institution administrator belonging to the same institution
        if ($user->isInstitutionAdmin() && $user->institution_id && $student->institution_id === $user->institution_id) {
            return true;
        }

        // Academic supervisor assigned to one of student's placements
        if ($user->isAcademicSupervisor()) {
            return $student->placements()
                ->where('academic_supervisor_id', $user->id)
                ->exists();
        }

        // Company supervisor assigned to one of student's placements
        if ($user->isCompanySupervisor() && $user->companySupervisor) {
            return $student->placements()
                ->where('company_supervisor_id', $user->companySupervisor->id)
                ->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can update the student profile.
     */
    public function update(User $user, Student $student): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($student->user_id === $user->id) {
            return true;
        }

        if ($user->isInstitutionAdmin() && $user->institution_id && $student->institution_id === $user->institution_id) {
            return true;
        }

        return false;
    }
}
