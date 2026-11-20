<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

class CompanyPolicy
{
    /**
     * Determine whether the user can view the company details.
     */
    public function view(User $user, Company $company): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Company manager of this company
        if ($user->isCompany() && $user->getCompanyId() === $company->id) {
            return true;
        }

        // Assigned supervisor of this company
        if ($user->isCompanySupervisor() && $user->getCompanyId() === $company->id) {
            return true;
        }

        // Institution admin with valid institution assignment
        if ($user->isInstitutionAdmin() && $user->institution_id) {
            return true;
        }

        // Student with active/accepted placement or application at this company
        if ($user->isStudent() && $user->student) {
            $studentId = $user->student->id;
            $hasPlacement = $company->placements()->where('student_id', $studentId)->exists();
            $hasApp = $company->attachmentSlots()->whereHas('applications', fn($q) => $q->where('student_id', $studentId))->exists();
            if ($hasPlacement || $hasApp) {
                return true;
            }
        }

        // Publicly verified partner company
        return (bool) $company->is_verified;
    }

    /**
     * Determine whether the user can manage the company.
     */
    public function manage(User $user, Company $company): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->isCompany() && $user->getCompanyId() === $company->id;
    }

    /**
     * Determine whether the user can create attachment slots for the company.
     * Restricted strictly to company manager and super_admin.
     */
    public function createSlot(User $user, Company $company): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->isCompany() && $user->getCompanyId() === $company->id;
    }
}
