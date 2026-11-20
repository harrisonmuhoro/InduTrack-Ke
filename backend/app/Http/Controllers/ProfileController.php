<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\Student;
use App\Models\Company;
use App\Models\CompanySupervisor;
use App\Models\InstitutionSupervisor;

/**
 * ProfileController
 *
 * OWNERSHIP RESOLUTION RULES:
 * - Company managers: resolved strictly via users.company_id (never email matching, never request body).
 * - Company supervisors: resolved strictly via company_supervisors.user_id relationship.
 * - Academic supervisors: resolved strictly via institution_supervisors.user_id relationship.
 * - Students: resolved strictly via students.user_id relationship.
 *
 * OPERATION ORDER (enforced in every mutating method):
 * 1. Authenticate (Sanctum middleware guarantees this before controller runs).
 * 2. Resolve the target profile entity using the authenticated user's relationships.
 * 3. Verify authorization (entity existence check; policy gate where applicable).
 * 4. Validate the request fields.
 * 5. Perform database changes (wrapped in a transaction for multi-table updates).
 *
 * FILE UPLOAD SAFETY:
 * - Entity is resolved and authorized before any file is stored.
 * - New file is stored only after authorization passes.
 * - Database record is updated after successful storage.
 * - If the database update fails, the newly stored file is deleted.
 * - Old files are replaced only after the new record is persisted.
 *
 * MASS-ASSIGNMENT PROTECTION:
 * - Sensitive ownership fields (institution_id, company_id, role identifiers) are
 *   never accepted from request input in profile operations.
 * - Only explicitly validated safe fields are written to the database.
 */
class ProfileController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────

    public function show(Request $request): JsonResponse
    {
        $user    = $request->user();
        $profile = ['user' => $user];

        if ($user->isStudent()) {
            $profile['student'] = Student::where('user_id', $user->id)->first();
        } elseif ($user->isCompany()) {
            $profile['company'] = $user->company_id
                ? Company::find($user->company_id)
                : null;
        } elseif ($user->isCompanySupervisor()) {
            $profile['company_supervisor'] = CompanySupervisor::with('company')
                ->where('user_id', $user->id)
                ->first();
        } elseif ($user->isAcademicSupervisor()) {
            $profile['academic_supervisor'] = InstitutionSupervisor::where('user_id', $user->id)->first();
        }

        return response()->json($profile);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE PROFILE
    // Ordering: resolve entity → validate → update (transaction for multi-table)
    // ─────────────────────────────────────────────────────────────────────────

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = null;
        $student = null;
        $academicSupervisor = null;

        // ── Step 1 & 2: Resolve the role-specific entity BEFORE any writes ──────
        if ($user->isCompany()) {
            $company = $this->resolveCompanyForManager($user);
            if (! $company) {
                return response()->json(['message' => 'No assigned company profile found for this manager.'], 404);
            }
        } elseif ($user->isAcademicSupervisor()) {
            $academicSupervisor = $this->resolveInstitutionSupervisor($user);
            if (! $academicSupervisor) {
                return response()->json(['message' => 'No institution supervisor record found for this academic supervisor.'], 404);
            }
        } elseif ($user->isStudent()) {
            $student = Student::where('user_id', $user->id)->first();
            if (! $student) {
                return response()->json(['message' => 'No student record found for this user.'], 404);
            }
        }

        // ── Step 3: Validate ONLY safe, explicitly listed user fields ────────────
        // NOTE: institution_id, company_id, role fields are intentionally excluded
        // from validation and therefore cannot be modified through this endpoint.
        $userValidData = $request->validate([
            'name'  => 'sometimes|string|min:3|max:100',
            'phone' => 'sometimes|string|regex:/^\+254[0-9]{9}$/',
        ]);

        // Validate every role-specific payload before the first write. Validation
        // exceptions raised after a partial write are harder to reason about and
        // should never be needed to provide atomicity.
        $companyData = [];
        $studentData = [];
        $asData = [];
        if ($user->isCompany()) {
            $companyData = $request->validate([
                'description'      => 'sometimes|string',
                'website'          => 'sometimes|url',
                'company_phone'    => 'sometimes|string',
                'address'          => 'sometimes|string',
            ]);
            if (array_key_exists('company_phone', $companyData)) {
                $companyData['phone'] = $companyData['company_phone'];
                unset($companyData['company_phone']);
            }
        } elseif ($user->isStudent()) {
            $studentData = $request->validate([
                'skills'                     => 'sometimes|array|min:1|max:20',
                'skills.*'                   => 'string|max:50',
                'emergency_contact'          => 'sometimes|array',
                'emergency_contact.name'     => 'required_with:emergency_contact|string|max:100',
                'emergency_contact.phone'    => 'required_with:emergency_contact|string|regex:/^\+254[0-9]{9}$/',
                'emergency_contact.relation' => 'required_with:emergency_contact|string|max:50',
            ]);
        } elseif ($user->isAcademicSupervisor()) {
            $asData = $request->validate(['department' => 'sometimes|string']);
        }

        // ── Step 4: Perform writes inside a transaction ──────────────────────────
        DB::transaction(function () use ($user, $userValidData, $companyData, $studentData, $asData, $company, $student, $academicSupervisor) {
            // Write user-level fields first
            if (! empty($userValidData)) {
                $user->update($userValidData);
            }

            // Role-specific sub-profile writes
            if ($user->isCompany()) {
                if (! empty($companyData)) {
                    $company->update($companyData);
                }
            } elseif ($user->isStudent()) {
                if (! empty($studentData)) {
                    $student->update($studentData);
                }
            } elseif ($user->isAcademicSupervisor()) {
                if (! empty($asData)) {
                    $academicSupervisor->update($asData);
                }
            }
        });

        return response()->json(['message' => 'Profile updated successfully']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE PASSWORD
    // ─────────────────────────────────────────────────────────────────────────

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|current_password',
            'password'         => 'required|min:8|confirmed|different:current_password',
        ]);

        $request->user()->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Password updated successfully']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE EMAIL
    // ─────────────────────────────────────────────────────────────────────────

    public function updateEmail(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|unique:users,email,' . $request->user()->id,
        ]);

        $user                   = $request->user();
        $user->email            = $request->email;
        $user->email_verified_at = null;
        $user->save();

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Email updated. Please verify your new email address.']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPLOAD PHOTO / LOGO
    // Order: resolve entity → authorize → validate → store file → update DB
    //        → on DB failure: delete newly stored file, re-throw
    //        → on success: delete old file
    // ─────────────────────────────────────────────────────────────────────────

    public function uploadPhoto(Request $request): JsonResponse
    {
        $user = $request->user();

        // ── Step 1: Resolve entity BEFORE touching the filesystem ───────────────
        if ($user->isCompany()) {
            $company = $this->resolveCompanyForManager($user);
            if (! $company) {
                return response()->json(['message' => 'No assigned company profile found for this manager.'], 404);
            }
        }

        // ── Step 2: Validate the file ───────────────────────────────────────────
        $request->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png|max:2048',
        ]);

        // ── Step 3: Store the new file ──────────────────────────────────────────
        $newPath = $request->file('photo')->store('profile_photos', 'public');

        // ── Step 4: Update the database record (clean up new file on failure) ───
        try {
            if ($user->isCompany()) {
                $oldPath = $company->logo_path;
                $company->update(['logo_path' => $newPath]);
            } else {
                $oldPath = $user->profile_photo_path;
                $user->update(['profile_photo_path' => $newPath]);
            }
        } catch (\Throwable $e) {
            // DB update failed — remove the orphaned newly-stored file
            Storage::disk('public')->delete($newPath);
            throw $e;
        }

        // ── Step 5: Remove old file only after new record is persisted ──────────
        if (! empty($oldPath) && $oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json(['message' => 'Photo uploaded successfully', 'path' => $newPath]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPLOAD CV (students only)
    // ─────────────────────────────────────────────────────────────────────────

    public function uploadCv(Request $request): JsonResponse
    {
        if (! $request->user()->isStudent()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Resolve student BEFORE touching the filesystem
        $student = Student::where('user_id', $request->user()->id)->first();
        if (! $student) {
            return response()->json(['message' => 'No student record found.'], 404);
        }

        $request->validate([
            'cv' => 'required|mimes:pdf|max:5120',
        ]);

        $oldPath = $student->cv_path;
        $newPath = $request->file('cv')->store('cvs', 'public');

        try {
            $student->update(['cv_path' => $newPath]);
        } catch (\Throwable $e) {
            Storage::disk('public')->delete($newPath);
            throw $e;
        }

        if (! empty($oldPath) && $oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json(['message' => 'CV uploaded successfully', 'path' => $newPath]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPLOAD TRANSCRIPT (students only)
    // ─────────────────────────────────────────────────────────────────────────

    public function uploadTranscript(Request $request): JsonResponse
    {
        if (! $request->user()->isStudent()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Resolve student BEFORE touching the filesystem
        $student = Student::where('user_id', $request->user()->id)->first();
        if (! $student) {
            return response()->json(['message' => 'No student record found.'], 404);
        }

        $request->validate([
            'transcript' => 'required|mimes:pdf|max:5120',
        ]);

        $oldPath = $student->transcript_path;
        $newPath = $request->file('transcript')->store('transcripts', 'public');

        try {
            $student->update(['transcript_path' => $newPath]);
        } catch (\Throwable $e) {
            Storage::disk('public')->delete($newPath);
            throw $e;
        }

        if (! empty($oldPath) && $oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json(['message' => 'Transcript uploaded successfully', 'path' => $newPath]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS — strict ownership resolution
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolve a company for the authenticated company manager.
     * Uses ONLY the users.company_id persisted relationship.
     * Never uses email matching. Never trusts request-supplied IDs.
     */
    private function resolveCompanyForManager(\App\Models\User $user): ?Company
    {
        if (! $user->company_id) {
            return null;
        }

        return Company::find($user->company_id);
    }

    /**
     * Resolve the InstitutionSupervisor record for the authenticated academic supervisor.
     * Uses ONLY the institution_supervisors.user_id relationship.
     */
    private function resolveInstitutionSupervisor(\App\Models\User $user): ?InstitutionSupervisor
    {
        return InstitutionSupervisor::where('user_id', $user->id)->first();
    }
}
