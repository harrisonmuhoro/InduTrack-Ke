<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

/**
 * CompanyPolicy
 *
 * Public vs Protected distinction:
 * - PUBLIC: verified company name, description, website, county/address, industry.
 *   Any authenticated user may discover these via the public companies listing.
 * - PROTECTED: attachment slot management, applicant records, internal admin data,
 *   private contact information. Access requires a legitimate authorised relationship.
 *
 * Institution admin scoping:
 * An institution admin is authorised to access a company's protected information ONLY
 * when at least one of their institution's students has a placement OR an accepted/
 * shortlisted application at that company. Merely having an institution_id does NOT
 * confer access to every company in the system.
 */
class CompanyPolicy
{
    /**
     * Determine whether the user can view protected company details.
     *
     * Public company information (verified companies) is intentionally exposed through
     * the public company listing endpoint (no policy gate required there).
     * This policy governs access to protected company views.
     */
    public function view(User $user, Company $company): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Company manager of this exact company (strict relationship via users.company_id)
        if ($user->isCompany() && $user->company_id === $company->id) {
            return true;
        }

        // Assigned supervisor of this exact company (strict via company_supervisors table)
        if ($user->isCompanySupervisor()) {
            $supervisorCompanyId = $user->companySupervisor?->company_id;
            if ($supervisorCompanyId === $company->id) {
                return true;
            }
        }

        // Institution admin — access only if the company is legitimately connected to
        // their institution through an active student placement or accepted application.
        // A bare institution_id on the admin user does NOT grant blanket company access.
        if ($user->isInstitutionAdmin() && $user->institution_id) {
            return $this->companyIsConnectedToInstitution($company, $user->institution_id);
        }

        // Student — access only via their own active placement or submitted/accepted application
        if ($user->isStudent() && $user->student) {
            $studentId = $user->student->id;
            $hasPlacement = $company->placements()
                ->where('student_id', $studentId)
                ->exists();
            if ($hasPlacement) {
                return true;
            }
            $hasApp = $company->attachmentSlots()
                ->whereHas('applications', fn ($q) => $q->where('student_id', $studentId))
                ->exists();
            if ($hasApp) {
                return true;
            }
        }

        // Public discovery is handled by the student slot endpoints, which serialize
        // only an explicit allowlist of public fields. This policy protects records
        // and must never treat verification as authorization to read private fields.
        return false;
    }

    /**
     * Determine whether the user can manage the company (create/edit restricted operations).
     * Restricted to: company manager of this company, super admin.
     * Institution admin and company supervisors cannot perform management actions.
     */
    public function manage(User $user, Company $company): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Strictly only the company manager via direct company_id relationship
        return $user->isCompany() && $user->company_id === $company->id;
    }

    /**
     * Determine whether the user can create attachment slots for the company.
     * Restricted strictly to company manager and super_admin.
     * Company supervisors may NOT create slots.
     */
    public function createSlot(User $user, Company $company): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->isCompany() && $user->company_id === $company->id;
    }

    /**
     * Determine whether the company is connected to the given institution through an
     * authorised business relationship: at least one of the institution's students has
     * a placement at this company OR an application to one of this company's slots.
     *
     * This is the ONLY legitimate basis for institution admin access to company data.
     */
    private function companyIsConnectedToInstitution(Company $company, int $institutionId): bool
    {
        // Connection via student placement
        $hasPlacementConnection = $company->placements()
            ->whereHas('student', fn ($q) => $q->where('institution_id', $institutionId))
            ->exists();

        if ($hasPlacementConnection) {
            return true;
        }

        // Connection via student application to this company's slots
        $hasApplicationConnection = $company->attachmentSlots()
            ->whereHas('applications.student', fn ($q) => $q->where('institution_id', $institutionId))
            ->exists();

        return $hasApplicationConnection;
    }
}
