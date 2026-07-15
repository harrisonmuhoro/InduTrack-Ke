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
    // ─── Analytics Dashboard ────────────────────────────────────────────────────

    public function analytics(Request $request)
    {
        $data = Cache::remember('institution_analytics', 300, function () {
            $totalStudents     = Student::count();
            $activePlacements  = Placement::where('status', 'active')->count();
            $openSlots         = AttachmentSlot::where('status', 'open')->count();
            $pendingDocuments  = Document::where('status', 'pending')->count();
            $flaggedStudents   = StudentFlag::where('resolved', false)->count();
            $completedPlacements = Placement::where('status', 'completed')->count();

            // Placement rate
            $placementRate = $totalStudents > 0
                ? round(($activePlacements + $completedPlacements) / $totalStudents * 100, 1)
                : 0;

            // This week logbook submissions
            $weekStart = now()->startOfWeek();
            $logbooksThisWeek = LogbookEntry::where('created_at', '>=', $weekStart)->count();

            // Students with no logbook entry in last 2 weeks (inactive)
            $cutoff = now()->subWeeks(2);
            $inactiveStudents = Student::whereHas('placements', function ($q) {
                $q->where('status', 'active');
            })->whereDoesntHave('placements.logbookEntries', function ($q) use ($cutoff) {
                $q->where('created_at', '>=', $cutoff);
            })->count();

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
        $query = Student::with('user', 'placements.company');

        if ($request->search) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%');
            })->orWhere('reg_number', 'like', '%' . $request->search . '%');
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

        return response()->json($student);
    }

    // ─── Company Management ──────────────────────────────────────────────────────

    public function companies(Request $request)
    {
        $query = Company::withCount(['attachmentSlots', 'ratings']);

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
        $company = Company::findOrFail($id);
        $company->update(['is_verified' => true]);
        Cache::forget('institution_analytics');
        return response()->json(['message' => 'Company verified successfully', 'company' => $company]);
    }

    public function blacklistCompany(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $company = Company::findOrFail($id);
        $company->update(['is_verified' => false, 'blacklist_reason' => $request->reason]);
        return response()->json(['message' => 'Company blacklisted', 'company' => $company]);
    }

    // ─── Placement Approval ──────────────────────────────────────────────────────

    public function placements(Request $request)
    {
        $query = Placement::with('student.user', 'company', 'period');

        if ($request->status) {
            $query->where('status', $request->status);
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function approvePlacement(Request $request, $id)
    {
        $placement = Placement::findOrFail($id);
        $placement->update(['status' => 'active']);
        Cache::forget('institution_analytics');
        return response()->json(['message' => 'Placement approved', 'placement' => $placement]);
    }

    public function rejectPlacement(Request $request, $id)
    {
        $request->validate(['reason' => 'nullable|string']);
        $placement = Placement::findOrFail($id);
        $placement->update(['status' => 'rejected']);
        return response()->json(['message' => 'Placement rejected', 'placement' => $placement]);
    }

    // ─── Compliance Monitor ──────────────────────────────────────────────────────

    public function compliance(Request $request)
    {
        // Students with active placement but no logbook in 2 weeks
        $cutoff2w = now()->subWeeks(2);
        $inactive = Placement::with('student.user', 'company')
            ->where('status', 'active')
            ->whereDoesntHave('logbookEntries', fn($q) => $q->where('created_at', '>=', $cutoff2w))
            ->get();

        // Flagged students
        $flagged = StudentFlag::with('placement.student.user', 'placement.company', 'flagger')
            ->where('resolved', false)
            ->latest()
            ->get();

        // Pending document reviews
        $pendingDocs = Document::with('student.user')
            ->where('status', 'pending')
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
        $flag = StudentFlag::findOrFail($flagId);
        $flag->update(['resolved' => true, 'resolved_at' => now()]);
        return response()->json(['message' => 'Flag resolved']);
    }

    // ─── Reports & Exports ───────────────────────────────────────────────────────

    public function reportPlacements(Request $request)
    {
        $placements = Placement::with('student.user', 'company', 'period')->get();

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
        $cutoff2w = now()->subWeeks(2);
        $data = [
            'total_active_placements' => Placement::where('status', 'active')->count(),
            'submitted_logbooks_this_week' => LogbookEntry::where('created_at', '>=', now()->startOfWeek())->count(),
            'inactive_students_count' => Placement::where('status', 'active')
                ->whereDoesntHave('logbookEntries', fn($q) => $q->where('created_at', '>=', $cutoff2w))
                ->count(),
            'unresolved_flags' => StudentFlag::where('resolved', false)->count(),
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

        $doc = Document::findOrFail($id);
        $doc->update([
            'status'           => $request->status,
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by'      => $request->user()->id,
            'reviewed_at'      => now(),
        ]);

        Cache::forget('institution_analytics');
        return response()->json($doc);
    }
}
