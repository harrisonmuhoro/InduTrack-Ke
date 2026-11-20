<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;

class DocumentPolicy
{
    public function view(User $user, Document $document): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Student owner
        if ($user->isStudent() && $document->student && $document->student->user_id === $user->id) {
            return true;
        }

        // Institution Admin of the student
        if ($user->isInstitutionAdmin() && $document->student) {
            return $document->student->institution_id === $user->institution_id;
        }

        return false;
    }

    public function download(User $user, Document $document): bool
    {
        return $this->view($user, $document);
    }

    public function review(User $user, Document $document): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isInstitutionAdmin() && $document->student) {
            return $document->student->institution_id === $user->institution_id;
        }

        return false;
    }
}
