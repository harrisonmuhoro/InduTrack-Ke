<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\User;

class ApplicationPolicy
{
    /**
     * Determine whether the user can view the application.
     */
    public function view(User $user, Application $application): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Student owner
        if ($user->isStudent() && $application->student && $application->student->user_id === $user->id) {
            return true;
        }

        // Company hosting the slot
        if (($user->isCompany() || $user->isCompanySupervisor()) && $application->slot) {
            return $application->slot->company_id === $user->getCompanyId();
        }

        // Institution Admin of the student
        if ($user->isInstitutionAdmin() && $application->student) {
            return $application->student->institution_id === $user->institution_id;
        }

        return false;
    }

    /**
     * Determine whether the user can update the status (shortlist/accept/reject).
     */
    public function updateStatus(User $user, Application $application): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Company owning the slot
        if (($user->isCompany() || $user->isCompanySupervisor()) && $application->slot) {
            return $application->slot->company_id === $user->getCompanyId();
        }

        return false;
    }

    /**
     * Determine whether the user can view/generate the offer letter.
     */
    public function generateOffer(User $user, Application $application): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isStudent() && $application->student && $application->student->user_id === $user->id) {
            return true;
        }

        if (($user->isCompany() || $user->isCompanySupervisor()) && $application->slot) {
            return $application->slot->company_id === $user->getCompanyId();
        }

        if ($user->isInstitutionAdmin() && $application->student) {
            return $application->student->institution_id === $user->institution_id;
        }

        return false;
    }
}
