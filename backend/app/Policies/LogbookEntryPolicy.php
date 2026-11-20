<?php

namespace App\Policies;

use App\Models\LogbookEntry;
use App\Models\User;

class LogbookEntryPolicy
{
    public function view(User $user, LogbookEntry $entry): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        $placement = $entry->placement;
        if (!$placement) {
            return false;
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

        // Institution Admin of student
        if ($user->isInstitutionAdmin() && $placement->student) {
            return $placement->student->institution_id === $user->institution_id;
        }

        return false;
    }

    public function update(User $user, LogbookEntry $entry): bool
    {
        $placement = $entry->placement;
        if (!$placement || !$placement->student) {
            return false;
        }

        // Only author student can update, and only if entry is editable (within 72h)
        if ($placement->student->user_id === $user->id) {
            return $entry->isEditable();
        }

        return false;
    }

    public function review(User $user, LogbookEntry $entry): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        $placement = $entry->placement;
        if (!$placement) {
            return false;
        }

        // Assigned academic supervisor
        if ($user->isAcademicSupervisor() && $placement->academic_supervisor_id === $user->id) {
            return true;
        }

        // Assigned company supervisor
        if ($user->isCompanySupervisor() && $placement->company_supervisor_id === $user->companySupervisor?->id) {
            return true;
        }

        return false;
    }

    public function addComment(User $user, LogbookEntry $entry): bool
    {
        return $this->view($user, $entry);
    }
}
