<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Student;
use App\Models\Company;
use App\Models\CompanySupervisor;
use App\Models\InstitutionSupervisor;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $profile = ['user' => $user];

        if ($user->hasRole('Student')) {
            $profile['student'] = Student::where('user_id', $user->id)->first();
        } elseif ($user->hasRole('Company')) {
            $profile['company'] = Company::where('email', $user->email)->first();
        } elseif ($user->hasRole('Company Supervisor')) {
            $profile['company_supervisor'] = CompanySupervisor::with('company')->where('user_id', $user->id)->first();
        } elseif ($user->hasRole('Academic Supervisor')) {
            $profile['academic_supervisor'] = InstitutionSupervisor::where('user_id', $user->id)->first();
        }
        
        return response()->json($profile);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        
        $userValidData = $request->validate([
            'name' => 'sometimes|string|min:3|max:100',
            'phone' => 'sometimes|string|regex:/^\+254[0-9]{9}$/',
        ]);
        
        if (!empty($userValidData)) {
            $user->update($userValidData);
        }

        if ($user->hasRole('Student')) {
            $student = Student::where('user_id', $user->id)->firstOrFail();
            $studentData = $request->validate([
                'skills' => 'sometimes|array|min:1|max:20',
                'skills.*' => 'string|max:50',
                'emergency_contact' => 'sometimes|array',
                'emergency_contact.name' => 'required_with:emergency_contact|string|max:100',
                'emergency_contact.phone' => 'required_with:emergency_contact|string|regex:/^\+254[0-9]{9}$/',
                'emergency_contact.relation' => 'required_with:emergency_contact|string|max:50',
            ]);
            if (!empty($studentData)) {
                $student->update($studentData);
            }
        } elseif ($user->hasRole('Company')) {
            $company = Company::where('email', $user->email)->firstOrFail();
            $companyData = $request->validate([
                'description' => 'sometimes|string',
                'website' => 'sometimes|url',
                'phone' => 'sometimes|string',
                'physical_address' => 'sometimes|string',
            ]);
            if (!empty($companyData)) {
                $company->update($companyData);
            }
        } elseif ($user->hasRole('Academic Supervisor')) {
            $academicSupervisor = InstitutionSupervisor::where('user_id', $user->id)->firstOrFail();
            $asData = $request->validate([
                'department' => 'sometimes|string',
            ]);
            if (!empty($asData)) {
                $academicSupervisor->update($asData);
            }
        }
        
        return response()->json(['message' => 'Profile updated successfully']);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|current_password',
            'password' => 'required|min:8|confirmed|different:current_password'
        ]);

        $request->user()->update([
            'password' => Hash::make($request->password)
        ]);

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function updateEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email,' . $request->user()->id
        ]);

        $user = $request->user();
        $user->email = $request->email;
        $user->email_verified_at = null;
        $user->save();
        
        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Email updated. Please verify your new email address.']);
    }

    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png|max:2048'
        ]);

        $path = $request->file('photo')->store('profile_photos', 'public');
        
        $user = $request->user();
        if ($user->hasRole('Company')) {
            $company = Company::where('email', $user->email)->firstOrFail();
            $company->update(['logo_path' => $path]);
        } else {
            $user->update(['profile_photo_path' => $path]);
        }

        return response()->json(['message' => 'Photo uploaded successfully', 'path' => $path]);
    }

    public function uploadCv(Request $request)
    {
        if (!$request->user()->hasRole('Student')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'cv' => 'required|mimes:pdf|max:5120'
        ]);

        $path = $request->file('cv')->store('cvs', 'public');
        
        Student::where('user_id', $request->user()->id)->update(['cv_path' => $path]);

        return response()->json(['message' => 'CV uploaded successfully', 'path' => $path]);
    }

    public function uploadTranscript(Request $request)
    {
        if (!$request->user()->hasRole('Student')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'transcript' => 'required|mimes:pdf|max:5120'
        ]);

        $path = $request->file('transcript')->store('transcripts', 'public');
        
        Student::where('user_id', $request->user()->id)->update(['transcript_path' => $path]);

        return response()->json(['message' => 'Transcript uploaded successfully', 'path' => $path]);
    }
}
