<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SuperAdminController extends Controller
{
    // ─── Dashboard ────────────────────────────────────────────────────────────
    public function dashboard()
    {
        return response()->json([
            'totalInstitutions' => Institution::count(),
            'activeInstitutions' => Institution::where('is_active', true)->count(),
            'totalUsers' => User::count(),
            'totalStudents' => DB::table('user_roles')
                ->join('roles', 'user_roles.role_id', '=', 'roles.id')
                ->where('roles.name', 'student')
                ->count(),
            'totalCompanies' => DB::table('companies')->count(),
            'totalPlacements' => DB::table('placements')->count(),
        ]);
    }

    // ─── Institutions CRUD ────────────────────────────────────────────────────
    public function institutions()
    {
        return response()->json(Institution::orderBy('name')->get());
    }

    public function storeInstitution(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'domain' => 'nullable|string|max:255|unique:institutions',
            'contact_email' => 'nullable|email|max:255',
        ]);

        $institution = Institution::create($request->only('name', 'domain', 'contact_email'));
        return response()->json($institution, 201);
    }

    public function updateInstitution(Request $request, $id)
    {
        $institution = Institution::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'domain' => 'sometimes|string|max:255|unique:institutions,domain,' . $id,
            'contact_email' => 'nullable|email|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $institution->update($request->only('name', 'domain', 'contact_email', 'is_active'));
        return response()->json($institution);
    }

    public function toggleInstitution($id)
    {
        $institution = Institution::findOrFail($id);
        $institution->update(['is_active' => !$institution->is_active]);
        return response()->json(['message' => $institution->is_active ? 'Institution activated.' : 'Institution deactivated.', 'institution' => $institution]);
    }

    // ─── User Management ──────────────────────────────────────────────────────
    public function users(Request $request)
    {
        $query = User::query();

        if ($request->role) {
            $query->whereHas('roles', function ($q) use ($request) {
                $q->where('name', $request->role);
            });
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        $users = $query->with('roles')->orderBy('created_at', 'desc')->paginate(25);
        return response()->json($users);
    }

    public function updateUserRole(Request $request, $id)
    {
        $request->validate([
            'role' => 'required|string|exists:roles,name',
        ]);

        $user = User::findOrFail($id);
        $roleId = DB::table('roles')->where('name', $request->role)->value('id');

        // Remove existing roles and assign the new one
        DB::table('user_roles')->where('user_id', $user->id)->delete();
        DB::table('user_roles')->insert(['user_id' => $user->id, 'role_id' => $roleId]);

        return response()->json(['message' => "User role updated to {$request->role}."]);
    }

    public function disableUser($id)
    {
        $user = User::findOrFail($id);
        // Revoke all tokens to effectively disable access
        $user->tokens()->delete();
        return response()->json(['message' => 'User disabled. All sessions revoked.']);
    }

    public function createUser(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|exists:roles,name',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $roleId = DB::table('roles')->where('name', $request->role)->value('id');
        if ($roleId) {
            DB::table('user_roles')->insert(['user_id' => $user->id, 'role_id' => $roleId]);
        }

        return response()->json($user, 201);
    }

    // ─── Audit Logs ───────────────────────────────────────────────────────────
    public function auditLogs(Request $request)
    {
        // If audit_logs table exists, query it; otherwise return empty
        if (!\Schema::hasTable('audit_logs')) {
            return response()->json(['data' => [], 'message' => 'Audit log table not yet configured.']);
        }

        $logs = DB::table('audit_logs')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($logs);
    }

    // ─── System Stats ─────────────────────────────────────────────────────────
    public function systemStats()
    {
        return response()->json([
            'storage_used' => $this->getStorageUsed(),
            'total_documents' => DB::table('documents')->count(),
            'total_logbook_entries' => DB::table('logbook_entries')->count(),
            'total_evaluations' => DB::table('evaluations')->count(),
            'total_field_visits' => DB::table('field_visits')->count(),
            'total_messages' => DB::table('messages')->count(),
        ]);
    }

    private function getStorageUsed()
    {
        $path = storage_path('app');
        if (!is_dir($path)) return '0 MB';

        $size = 0;
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path)) as $file) {
            if ($file->isFile()) $size += $file->getSize();
        }

        return round($size / 1024 / 1024, 2) . ' MB';
    }

    // ─── Announcements ────────────────────────────────────────────────────────
    public function broadcast(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        // Send a notification to all users
        $users = User::all();
        foreach ($users as $user) {
            $user->notify(new \App\Notifications\SystemAnnouncement($request->message));
        }

        return response()->json(['message' => 'Announcement broadcast to ' . $users->count() . ' users.']);
    }
}
