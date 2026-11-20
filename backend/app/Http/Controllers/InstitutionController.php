<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Document;
use App\Models\Placement;
use App\Models\Student;
use App\Models\AttachmentSlot;
use App\Models\StudentFlag;
use App\Models\Application;
use App\Models\LogbookEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Barryvdh\DomPDF\Facade\Pdf;

class InstitutionController extends Controller
{
    /**
     * Resolve and validate the institution ID for the authenticated user.
     * - super_admin: returns null (unrestricted access)
     * - institution_admin with valid institution_id: returns that ID
     * - institution_admin with NULL institution_id: aborts with 403
     */
    private function resolveInstitutionId(Request $request): ?int
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return null; // null = no institution filter = superadmin sees all
        }

        if (!$user->institution_id) {
            abort(403, 'Forbidden. Institution administrator has no assigned institution.');
        }

        return (int) $user->institution_id;
    }

    // ─── Analytics Dashboard ────────────────────────────────────────────────────

    public function analytics(Request $request)
    {
        $user    = $request->user();
        $instId  = $this->resolveInstitutionId($request); // throws 403 on null non-super
        $isSuper = $user->isSuperAdmin();

        $cacheKey = $isSuper ? 'analytics_superadmin' : "analytics_inst_{$instId}";

        $data = Cache::remember($cacheKey, 300, function () use ($instId, $isSuper) {
            $studentQuery = Student::query();
            if (!$isSuper) {
                $studentQuery->where('institution_id', $instId);
            }
            $totalStudents = $studentQuery->count();

            $placementQuery = Placement::query();
            if (!$isSuper) {
                $placementQuery->whereHas('student', fn($q) => $q->where('institution_id', $instId));
            }
            $activePlacements    = (clone $placementQuery)->where('status', 'active')->count();
            $completedPlacements = (clone $placementQuery)->where('status', 'completed')->count();

            $openSlots = AttachmentSlot::where('status', 'open')->count();

            $docQuery = Document::where('status', 'pending');
            if (!$isSuper) {
                $docQuery->whereHas('student', fn($q) => $q->where('institution_id', $instId));
            }
            $pendingDocuments = $docQuery->count();

            $flagQuery = StudentFlag::where('resolved', false);
            if (!$isSuper) {
                $flagQuery->whereHas('placement.student', fn($q) => $q->where('institution_id', $instId));
            }
            $flaggedStudents = $flagQuery->count();

            // Placement rate
            $placementRate = $totalStudents > 0
                ? round(($activePlacements + $completedPlacements) / $totalStudents * 100, 1)
                : 0;

            // This week logbook submissions
            $weekStart = now()->startOfWeek();
            $logbookQuery = LogbookEntry::where('created_at', '>=', $weekStart);
            if (!$isSuper) {
                $logbookQuery->whereHas('placement.student', fn($q) => $q->where('institution_id', $instId));
            }
            $logbooksThisWeek = $logbookQuery->count();

            // Inactive students (no logbook in 2 weeks)
            $cutoff = now()->subWeeks(2);
            $inactiveQuery = Student::whereHas('placements', fn($q) => $q->where('status', 'active'))
                ->whereDoesntHave('placements.logbookEntries', fn($q) => $q->where('created_at', '>=', $cutoff));
            if (!$isSuper) {
                $inactiveQuery->where('institution_id', $instId);
            }
            $inactiveStudents = $inactiveQuery->count();

            return compact(
                'totalStudents', 'activePlacements', 'openSlots',
                'pendingDocuments', 'flaggedStudents', 'completedPlacements',
                'placementRate', 'logbooksThisWeek', 'inactiveStudents'
            );
        });

        return response()->json($data);
    }

    // ─── Notifications ───────────────────────────────────────────────────────────

    public function notifications(Request $request)
    {
        return response()->json($request->user()->notifications);
    }

    public function markNotificationsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'Marked as read']);
    }

    // ─── Student Management ──────────────────────────────────────────────────────

    public function students(Request $request)
    {
        $user   = $request->user();
        $instId = $this->resolveInstitutionId($request);
        $query  = Student::with('user', 'placements.company');

        // Institutional boundary — always applied for non-superadmin
        if (!$user->isSuperAdmin()) {
            $query->where('institution_id', $instId);
        }

        if ($request->search) {
            $query->where(function ($sq) use ($request) {
                $sq->whereHas('user', function ($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%');
                })->orWhere('reg_number', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->status) {
            $query->whereHas('placements', fn($q) => $q->where('status', $request->status));
        }

        if ($request->department) {
            $query->where('department', $request->department);
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function studentDetail(Request $request, $id)
    {
        $student = Student::with([
            'user',
            'placements.company',
            'placements.logbookEntries',
            'placements.evaluations',
            'documents',
        ])->findOrFail($id);

        // Enforce policy authorization (StudentPolicy::view)
        $this->authorize('view', $student);

        return response()->json($student);
    }

    // ─── Company Management ──────────────────────────────────────────────────────

    public function companies(Request $request)
    {
        $user = $request->user();
        $institutionId = $this->resolveInstitutionId($request);
        $query = Company::withCount(['attachmentSlots', 'ratings']);

        // Institution admins can inspect companies only when an existing student
        // workflow links that company to their institution. Super admins retain the
        // system-wide listing.
        if (! $user->isSuperAdmin()) {
            $query->where(function ($q) use ($institutionId) {
                $q->whereHas('placements.student', fn ($students) => $students->where('institution_id', $institutionId))
                    ->orWhereHas('attachmentSlots.applications.student', fn ($students) => $students->where('institution_id', $institutionId));
            });
        }

        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        if ($request->verified !== null) {
            $query->where('is_verified', filter_var($request->verified, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function verifyCompany(Request $request, $id)
    {
        // Super admin only — institution admins cannot globally verify companies
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden. Only super administrators can verify companies.'], 403);
        }

        $company = Company::findOrFail($id);
        $company->update(['is_verified' => true]);
        Cache::flush();
        return response()->json(['message' => 'Company verified successfully', 'company' => $company]);
    }

    public function blacklistCompany(Request $request, $id)
    {
        // Super admin only
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden. Only super administrators can blacklist companies.'], 403);
        }

        $request->validate(['reason' => 'required|string']);
        $company = Company::findOrFail($id);
        $company->update(['is_verified' => false, 'blacklist_reason' => $request->reason]);
        Cache::flush();
        return response()->json(['message' => 'Company blacklisted', 'company' => $company]);
    }

    // ─── Placement Approval ──────────────────────────────────────────────────────

    public function placements(Request $request)
    {
        $user   = $request->user();
        $instId = $this->resolveInstitutionId($request);
        $query  = Placement::with('student.user', 'company', 'period');

        // Scoped to institution — always enforced for non-superadmin
        if (!$user->isSuperAdmin()) {
            $query->whereHas('student', fn($q) => $q->where('institution_id', $instId));
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function approvePlacement(Request $request, $id)
    {
        $placement = Placement::with('student')->findOrFail($id);

        // Enforce policy authorization (PlacementPolicy::approve)
        $this->authorize('approve', $placement);

        $placement->update(['status' => 'active']);
        Cache::flush();
        return response()->json(['message' => 'Placement approved', 'placement' => $placement]);
    }

    public function rejectPlacement(Request $request, $id)
    {
        $request->validate(['reason' => 'nullable|string']);
        $placement = Placement::with('student')->findOrFail($id);

        // Enforce policy authorization (PlacementPolicy::approve)
        $this->authorize('approve', $placement);

        $placement->update(['status' => 'rejected']);
        Cache::flush();
        return response()->json(['message' => 'Placement rejected', 'placement' => $placement]);
    }

    // ─── Compliance Monitor ──────────────────────────────────────────────────────

    public function compliance(Request $request)
    {
        $user     = $request->user();
        $instId   = $this->resolveInstitutionId($request);
        $isSuper  = $user->isSuperAdmin();
        $cutoff2w = now()->subWeeks(2);

        // Students with active placement but no logbook in 2 weeks
        $inactive = Placement::with('student.user', 'company')
            ->where('status', 'active')
            ->when(!$isSuper, fn($q) => $q->whereHas('student', fn($s) => $s->where('institution_id', $instId)))
            ->whereDoesntHave('logbookEntries', fn($q) => $q->where('created_at', '>=', $cutoff2w))
            ->get();

        // Flagged students
        $flagged = StudentFlag::with('placement.student.user', 'placement.company', 'flagger')
            ->where('resolved', false)
            ->when(!$isSuper, fn($q) => $q->whereHas('placement.student', fn($s) => $s->where('institution_id', $instId)))
            ->latest()
            ->get();

        // Pending document reviews
        $pendingDocs = Document::with('student.user')
            ->where('status', 'pending')
            ->when(!$isSuper, fn($q) => $q->whereHas('student', fn($s) => $s->where('institution_id', $instId)))
            ->latest()
            ->get();

        return response()->json([
            'inactive_students' => $inactive,
            'flagged_students'  => $flagged,
            'pending_documents' => $pendingDocs,
        ]);
    }

    public function resolveFlag(Request $request, $flagId)
    {
        $flag   = StudentFlag::with('placement.student')->findOrFail($flagId);
        $user   = $request->user();
        $instId = $this->resolveInstitutionId($request);

        // Institutional check
        if (!$user->isSuperAdmin() && $flag->placement?->student?->institution_id !== $instId) {
            return response()->json(['message' => 'Forbidden. Cannot resolve flag for another institution.'], 403);
        }

        $flag->update(['resolved' => true, 'resolved_at' => now()]);
        return response()->json(['message' => 'Flag resolved']);
    }

    // ─── Reports & Exports ───────────────────────────────────────────────────────

    public function reportPlacements(Request $request)
    {
        $user   = $request->user();
        $instId = $this->resolveInstitutionId($request);
        $query  = Placement::with('student.user', 'company', 'period');

        if (!$user->isSuperAdmin()) {
            $query->whereHas('student', fn($q) => $q->where('institution_id', $instId));
        }

        $placements = $query->get();

        if ($request->format === 'csv') {
            $csv = "Student,Reg Number,Company,Status,Period\n";
            foreach ($placements as $p) {
                $csv .= implode(',', [
                    '"' . ($p->student->user->name ?? '') . '"',
                    '"' . ($p->student->reg_number ?? '') . '"',
                    '"' . ($p->company->name ?? '') . '"',
                    '"' . $p->status . '"',
                    '"' . ($p->period->name ?? '') . '"',
                ]) . "\n";
            }
            return response($csv, 200, [
                'Content-Type'        => 'text/csv',
                'Content-Disposition' => 'attachment; filename="placements_report.csv"',
            ]);
        }

        return response()->json($placements);
    }

    public function reportCompliance(Request $request)
    {
        $user     = $request->user();
        $instId   = $this->resolveInstitutionId($request);
        $isSuper  = $user->isSuperAdmin();
        $cutoff2w = now()->subWeeks(2);

        $placementQuery = Placement::where('status', 'active');
        if (!$isSuper) {
            $placementQuery->whereHas('student', fn($q) => $q->where('institution_id', $instId));
        }
        $totalActive = $placementQuery->count();

        $logbookQuery = LogbookEntry::where('created_at', '>=', now()->startOfWeek());
        if (!$isSuper) {
            $logbookQuery->whereHas('placement.student', fn($q) => $q->where('institution_id', $instId));
        }
        $logbooksThisWeek = $logbookQuery->count();

        $inactiveQuery = Placement::where('status', 'active')
            ->whereDoesntHave('logbookEntries', fn($q) => $q->where('created_at', '>=', $cutoff2w));
        if (!$isSuper) {
            $inactiveQuery->whereHas('student', fn($q) => $q->where('institution_id', $instId));
        }
        $inactiveCount = $inactiveQuery->count();

        $flagQuery = StudentFlag::where('resolved', false);
        if (!$isSuper) {
            $flagQuery->whereHas('placement.student', fn($q) => $q->where('institution_id', $instId));
        }
        $unresolvedFlags = $flagQuery->count();

        $data = [
            'total_active_placements'      => $totalActive,
            'submitted_logbooks_this_week' => $logbooksThisWeek,
            'inactive_students_count'      => $inactiveCount,
            'unresolved_flags'             => $unresolvedFlags,
        ];

        if ($request->format === 'csv') {
            $csv = "Metric,Value\n";
            foreach ($data as $k => $v) {
                $csv .= "\"$k\",\"$v\"\n";
            }
            return response($csv, 200, [
                'Content-Type'        => 'text/csv',
                'Content-Disposition' => 'attachment; filename="compliance_report.csv"',
            ]);
        }

        return response()->json($data);
    }

    // ─── Document Review ─────────────────────────────────────────────────────────

    public function reviewDocument(Request $request, $id)
    {
        $request->validate([
            'status'           => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|nullable|string',
        ]);

        $doc    = Document::with('student')->findOrFail($id);
        $user   = $request->user();
        $instId = $this->resolveInstitutionId($request);

        // Enforce institutional boundary
        if (!$user->isSuperAdmin() && $doc->student?->institution_id !== $instId) {
            return response()->json(['message' => 'Forbidden. Cannot review documents for another institution.'], 403);
        }

        $doc->update([
            'status'           => $request->status,
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by'      => $user->id,
            'reviewed_at'      => now(),
        ]);

        Cache::flush();
        return response()->json($doc);
    }
}
