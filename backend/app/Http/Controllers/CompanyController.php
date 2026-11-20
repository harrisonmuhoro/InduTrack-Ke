<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\CompanySupervisor;
use App\Models\AttachmentSlot;
use App\Models\Application;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    /**
     * Resolve the company for the authenticated user.
     * Uses ONLY persisted database relationships — no email matching, no fallbacks.
     *
     * - company manager: users.company_id
     * - company supervisor: via company_supervisors table
     * - super_admin: cannot implicitly resolve a single company (must be context-specific)
     */
    private function getCompany(Request $request): ?Company
    {
        $user = $request->user();

        // Company manager: direct company_id on users table
        if ($user->company_id) {
            return Company::find($user->company_id);
        }

        // Company supervisor: via CompanySupervisor relationship
        $supervisor = CompanySupervisor::where('user_id', $user->id)->first();
        if ($supervisor?->company) {
            return $supervisor->company;
        }

        return null;
    }

    public function slots(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['message' => 'No company profile found for this user.'], 404);
        }

        return response()->json(
            $company->attachmentSlots()->withCount('applications')->get()
        );
    }

    public function createSlot(Request $request)
    {
        $validated = $request->validate([
            'department'      => 'required|string',
            'capacity'        => 'required|integer|min:1',
            'required_skills' => 'nullable|string',
            'duration'        => 'nullable|string',
            'has_stipend'     => 'boolean',
            'stipend_amount'  => 'nullable|numeric|min:0',
            'description'     => 'nullable|string',
        ]);

        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['message' => 'No company profile found for this user.'], 404);
        }

        // Authorization: only company manager (not supervisor) may create slots
        $this->authorize('createSlot', $company);

        // Persist ONLY validated fields — not $request->all()
        $slot = $company->attachmentSlots()->create($validated);

        return response()->json($slot, 201);
    }

    public function applicants(Request $request, $slotId)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['message' => 'No company profile found for this user.'], 404);
        }

        $slot = $company->attachmentSlots()->findOrFail($slotId);

        return response()->json($slot->applications()->with('student.user')->get());
    }

    public function allApplicants(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['message' => 'No company profile found for this user.'], 404);
        }

        $applications = Application::with('student.user', 'slot')
            ->whereHas('slot', fn($q) => $q->where('company_id', $company->id))
            ->get();

        return response()->json($applications);
    }
}
