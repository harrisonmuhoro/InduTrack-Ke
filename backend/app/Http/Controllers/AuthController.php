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
            'role' => User::canonicalRoleName($roleName),
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
        } elseif ($role === 'institution_admin') {
            return $user->name . ' (' . ($user->institution->name ?? 'Unknown Institution') . ')';
        } elseif (User::canonicalRoleName($role) === 'academic_supervisor') {
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

        // Discard any earlier partial challenge and rotate the session before
        // creating a new login state. A pending challenge is never an authenticated
        // session and cannot inherit another user's authenticated state.
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Get the user's primary role
        $role = DB::table('user_roles')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('user_roles.user_id', $user->id)
            ->value('roles.name');

        // Check if 2FA is enabled
        if ($user->two_factor_enabled) {
            $request->session()->put('2fa:user:id', $user->id);
            $request->session()->put('2fa:started_at', now()->timestamp);
            return response()->json([
                '2fa_required' => true,
                'setup_required' => empty($user->google2fa_secret),
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'role' => User::canonicalRoleName($role ?? 'student'),
            'user' => $user,
            'context' => $this->getUserContextString($user, $role)
        ]);
    }

    public function setup2fa(Request $request)
    {
        [$user, $isPending] = $this->resolveTwoFactorUser($request);
        if (! $user) {
            return response()->json(['message' => 'A valid login challenge or authenticated session is required.'], 401);
        }

        if ($isPending && (! $user->two_factor_enabled || $user->google2fa_secret)) {
            return response()->json(['message' => 'This login requires code verification and cannot start enrollment.'], 403);
        }
        if (! $isPending && $user->two_factor_enabled) {
            return response()->json(['message' => 'Two-factor authentication is already enabled.'], 409);
        }
        
        $google2fa = app('pragmarx.google2fa');
        
        if (! $user->google2fa_secret) {
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
        $request->validate(['otp' => 'required|string|size:6|regex:/^[0-9]{6}$/']);
        [$user, $isPending] = $this->resolveTwoFactorUser($request);
        if (! $user) {
            return response()->json(['message' => 'A valid login challenge or authenticated session is required.'], 401);
        }
        if (! $user->google2fa_secret) {
            return response()->json(['message' => 'Set up an authenticator before verifying a code.'], 422);
        }

        $google2fa = app('pragmarx.google2fa');
        $valid = $google2fa->verifyKey($user->google2fa_secret, $request->otp);

        if (! $valid) {
            return response()->json(['message' => 'Invalid authentication code.'], 422);
        }

        if ($isPending || ! $user->two_factor_enabled) {
            $user->two_factor_enabled = true;
            $user->save();
        }

        if ($isPending) {
            Auth::login($user);
            $request->session()->forget(['2fa:user:id', '2fa:started_at']);
            $request->session()->regenerate();
        }

        return $this->authenticatedUserResponse($user);
    }

    public function toggle2fa(Request $request)
    {
        $user = $request->user();
        if (! $user->two_factor_enabled) {
            return response()->json(['message' => 'Use setup and code verification to enable two-factor authentication.'], 409);
        }
        if (! $user->google2fa_secret) {
            return response()->json(['message' => 'Two-factor authentication has no configured secret; contact an administrator.'], 422);
        }

        $request->validate([
            'current_password' => 'required|current_password',
            'otp' => 'required|string|size:6|regex:/^[0-9]{6}$/',
        ]);
        $valid = app('pragmarx.google2fa')->verifyKey($user->google2fa_secret, $request->otp);
        if (! $valid) {
            return response()->json(['message' => 'Invalid authentication code.'], 422);
        }

        $user->two_factor_enabled = false;
        $user->google2fa_secret = null;
        $user->save();

        return response()->json([
            'message' => 'Two-factor authentication disabled.',
            'enabled' => false,
        ]);
    }

    /** Resolve the short-lived password-verified challenge or current authenticated user. */
    private function resolveTwoFactorUser(Request $request): array
    {
        $pendingId = $request->session()->get('2fa:user:id');
        if ($pendingId) {
            $startedAt = (int) $request->session()->get('2fa:started_at', 0);
            $age = now()->timestamp - $startedAt;
            if ($startedAt <= 0 || $age < 0 || $age > 300) {
                $request->session()->forget(['2fa:user:id', '2fa:started_at']);
                return [null, true];
            }

            return [User::find($pendingId), true];
        }

        return [$request->user(), false];
    }

    private function authenticatedUserResponse(User $user)
    {
        $role = DB::table('user_roles')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('user_roles.user_id', $user->id)
            ->value('roles.name');

        return response()->json([
            'role' => User::canonicalRoleName($role ?? 'student'),
            'user' => $user,
            'context' => $this->getUserContextString($user, $role),
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
            'role' => User::canonicalRoleName($role),
            'context' => $this->getUserContextString($user, $role)
        ]);
    }
}
