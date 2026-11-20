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
        return true;
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
