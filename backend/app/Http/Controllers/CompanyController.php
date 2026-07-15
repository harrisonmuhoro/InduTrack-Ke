<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\CompanySupervisor;
use App\Models\AttachmentSlot;
use App\Models\Application;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    private function getCompany(Request $request): Company
    {
        // Try to get company via the CompanySupervisor relationship
        $supervisor = CompanySupervisor::where('user_id', $request->user()->id)->first();
        if ($supervisor) {
            return $supervisor->company;
        }
        // Fallback: match by email (for admins who own the company)
        $company = Company::where('email', $request->user()->email)->first();
        if (!$company) {
            $company = Company::create([
                'name' => $request->user()->name,
                'email' => $request->user()->email,
            ]);
        }
        return $company;
    }



    public function slots(Request $request)
    {
        $company = $this->getCompany($request);
        return response()->json(
            $company->attachmentSlots()->withCount('applications')->get()
        );
    }

    public function createSlot(Request $request)
    {
        $request->validate([
            'department' => 'required|string',
            'capacity' => 'required|integer',
        ]);

        $company = $this->getCompany($request);
        $slot = $company->attachmentSlots()->create($request->all());

        return response()->json($slot, 201);
    }

    public function applicants(Request $request, $slotId)
    {
        $company = $this->getCompany($request);
        $slot = $company->attachmentSlots()->findOrFail($slotId);

        return response()->json($slot->applications()->with('student.user')->get());
    }

    public function allApplicants(Request $request)
    {
        $company = $this->getCompany($request);
        $applications = Application::with('student.user', 'slot')
            ->whereHas('slot', fn($q) => $q->where('company_id', $company->id))
            ->get();

        return response()->json($applications);
    }
}
