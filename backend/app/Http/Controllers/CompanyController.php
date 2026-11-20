<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\CompanySupervisor;
use App\Models\AttachmentSlot;
use App\Models\Application;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    private function getCompany(Request $request): ?Company
    {
        // 1. Try to get company via the CompanySupervisor relationship
        $supervisor = CompanySupervisor::where('user_id', $request->user()->id)->first();
        if ($supervisor && $supervisor->company) {
            return $supervisor->company;
        }

        // 2. Match by email (company account)
        $company = Company::where('email', $request->user()->email)->first();
        if ($company) {
            return $company;
        }

        // 3. Fallback for super admin testing
        if ($request->user()->isSuperAdmin()) {
            return Company::first();
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
        $request->validate([
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

        $slot = $company->attachmentSlots()->create($request->all());

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
