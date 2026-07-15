<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

use Illuminate\Auth\Events\Registered;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'nullable|string|in:student',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        event(new Registered($user));

        // Assign role
        $roleName = $request->role ?? 'student';
        $roleId = DB::table('roles')->where('name', $roleName)->value('id');
        if ($roleId) {
            DB::table('user_roles')->insert(['user_id' => $user->id, 'role_id' => $roleId]);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'role' => $roleName,
            'user' => $user,
            'context' => $this->getUserContextString($user, $roleName)
        ], 201);
    }

    private function getUserContextString($user, $role)
    {
        if ($role === 'student') {
            $student = \App\Models\Student::with('institution')->where('user_id', $user->id)->first();
            return $user->name . ' (' . ($student->institution->name ?? 'Unknown Institution') . ')';
        } elseif ($role === 'company_supervisor') {
            $sup = \App\Models\CompanySupervisor::with('company')->where('user_id', $user->id)->first();
            return $user->name . ' (' . ($sup->company->name ?? 'Unknown Company') . ')';
        } elseif ($role === 'institution_supervisor' || $role === 'institution_admin') {
            $sup = \App\Models\InstitutionSupervisor::with('institution')->where('user_id', $user->id)->first();
            return $user->name . ' (' . ($sup->institution->name ?? 'University of Nairobi') . ')';
        } else {
            return $user->name;
        }
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        // Get the user's primary role
        $role = DB::table('user_roles')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('user_roles.user_id', $user->id)
            ->value('roles.name');

        // Check if 2FA is enabled
        if ($user->two_factor_enabled) {
            // Log in partially or fully? We should wait to regenerate session completely, but since we are stateful,
            // we can set a session flag instead of a temp token.
            $request->session()->put('2fa:user:id', $user->id);
            return response()->json([
                '2fa_required' => true,
                'setup_required' => empty($user->google2fa_secret)
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'role' => $role ?? 'student',
            'user' => $user,
            'context' => $this->getUserContextString($user, $role)
        ]);
    }

    public function setup2fa(Request $request)
    {
        $userId = $request->session()->get('2fa:user:id');
        $user = $userId ? User::find($userId) : $request->user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        
        $google2fa = app('pragmarx.google2fa');
        
        if (!$user->google2fa_secret) {
            $user->google2fa_secret = $google2fa->generateSecretKey();
            $user->save();
        }
        
        $qrCodeSvg = $google2fa->getQRCodeInline(
            config('app.name'),
            $user->email,
            $user->google2fa_secret
        );
        
        return response()->json([
            'secret' => $user->google2fa_secret,
            'qr_code_svg' => $qrCodeSvg
        ]);
    }

    public function verify2fa(Request $request)
    {
        $request->validate(['otp' => 'required|string']);
        
        $userId = $request->session()->get('2fa:user:id');
        $user = $userId ? User::find($userId) : $request->user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        
        $google2fa = app('pragmarx.google2fa');
        $valid = $google2fa->verifyKey($user->google2fa_secret, $request->otp);
        
        if ($valid) {
            if (!$user->two_factor_enabled) {
                $user->two_factor_enabled = true;
                $user->save();
            }
            
            if ($userId) {
                Auth::login($user);
                $request->session()->forget('2fa:user:id');
                $request->session()->regenerate();
            }
            
            return response()->json([
                'role' => $role ?? 'student',
                'user' => $user,
                'context' => $this->getUserContextString($user, $role)
            ]);
        }
        
        return response()->json(['message' => 'Invalid OTP'], 400);
    }

    public function toggle2fa(Request $request)
    {
        $user = $request->user();
        $user->two_factor_enabled = !$user->two_factor_enabled;
        
        if ($user->two_factor_enabled && !$user->google2fa_secret) {
            $google2fa = app('pragmarx.google2fa');
            $user->google2fa_secret = $google2fa->generateSecretKey();
        }
        
        $user->save();
        
        return response()->json([
            'message' => '2FA ' . ($user->two_factor_enabled ? 'enabled' : 'disabled'),
            'enabled' => $user->two_factor_enabled
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function profile(Request $request)
    {
        $user = $request->user();
        $role = DB::table('user_roles')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('user_roles.user_id', $user->id)
            ->value('roles.name');

        return response()->json([
            ...$user->toArray(),
            'role' => $role,
            'context' => $this->getUserContextString($user, $role)
        ]);
    }
}
