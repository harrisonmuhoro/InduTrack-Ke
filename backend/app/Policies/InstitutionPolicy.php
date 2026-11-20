<?php

namespace App\Policies;

use App\Models\Institution;
use App\Models\User;

class InstitutionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function view(User $user, Institution $institution): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->institution_id === $institution->id;
    }

    public function manage(User $user, Institution $institution): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->isInstitutionAdmin() && $user->institution_id === $institution->id;
    }
}
