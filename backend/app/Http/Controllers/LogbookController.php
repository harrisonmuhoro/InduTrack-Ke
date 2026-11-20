<?php

namespace App\Http\Controllers;

use App\Models\LogbookEntry;
use App\Models\Placement;
use App\Models\Student;
use Illuminate\Http\Request;
use Carbon\Carbon;

class LogbookController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'entry_date'      => 'required|date',
            'week_number'     => 'required|integer|min:1',
            'activities'      => 'required|string',
            'lessons_learned' => 'nullable|string',
            'challenges'      => 'nullable|string',
            'plan_next_week'  => 'nullable|string',
        ]);

        $student = Student::where('user_id', $request->user()->id)->firstOrFail();
        $placement = Placement::where('student_id', $student->id)
            ->where('status', 'active')
            ->first();

        if (!$placement) {
            return response()->json(['message' => 'No active placement found for logbook submission.'], 422);
        }

        // Prevent duplicate week entries
        $existing = LogbookEntry::where('placement_id', $placement->id)
            ->where('week_number', $request->week_number)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'An entry for this week already exists.'], 422);
        }

        $entry = LogbookEntry::create([
            'placement_id'    => $placement->id,
            'entry_date'      => $request->entry_date,
            'week_number'     => $request->week_number,
            'activities'      => $request->activities,
            'lessons_learned' => $request->lessons_learned,
            'challenges'      => $request->challenges,
            'plan_next_week'  => $request->plan_next_week,
            'status'          => 'draft',
        ]);

        return response()->json($entry, 201);
    }

    public function update(Request $request, $id)
    {
        $entry = LogbookEntry::with('placement.student')->findOrFail($id);
        $user = $request->user();

        // Enforce ownership: only author student can edit
        if (!$user->isSuperAdmin() && $entry->placement?->student?->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden. You do not own this logbook entry.'], 403);
        }

        if (!$entry->isEditable()) {
            return response()->json(['message' => 'This logbook entry is locked and cannot be edited.'], 403);
        }

        $entry->update($request->only([
            'activities', 'lessons_learned', 'challenges', 'plan_next_week',
        ]));

        return response()->json($entry);
    }

    public function index(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) return response()->json([]);
        
        $placement = Placement::where('student_id', $student->id)
            ->where('status', 'active')
            ->first();

        if (!$placement) {
            return response()->json([]);
        }

        $entries = $placement->logbookEntries()
            ->with('comments.user')
            ->orderBy('week_number')
            ->get()
            ->map(function ($entry) {
                $entry->is_editable = $entry->isEditable();
                return $entry;
            });

        return response()->json($entries);
    }

    public function addComment(Request $request, $entryId)
    {
        $request->validate(['comment' => 'required|string']);
        $entry = LogbookEntry::with('placement.student')->findOrFail($entryId);
        $placement = $entry->placement;
        $user = $request->user();

        $isStudent = ($placement->student?->user_id === $user->id);
        $isAcademic = ($placement->academic_supervisor_id === $user->id);
        $isCompany = ($user->companySupervisor && $placement->company_supervisor_id === $user->companySupervisor->id);
        $isInstAdmin = ($user->isInstitutionAdmin() && $placement->student?->institution_id === $user->institution_id);

        if (!$user->isSuperAdmin() && !$isStudent && !$isAcademic && !$isCompany && !$isInstAdmin) {
            return response()->json(['message' => 'Forbidden. You are not authorized to comment on this logbook.'], 403);
        }

        $comment = $entry->comments()->create([
            'user_id' => $user->id,
            'comment' => $request->comment,
        ]);

        // Auto-approve entry when supervisor comments
        if (($isAcademic || $isCompany) && in_array($entry->status, ['draft', 'submitted'])) {
            $entry->update(['status' => 'reviewed']);
        }

        return response()->json($comment->load('user'), 201);
    }

    public function reviewEntry(Request $request, $entryId)
    {
        $request->validate([
            'action'  => 'required|in:approved,rejected,flagged',
            'comment' => 'nullable|string',
        ]);

        $entry = LogbookEntry::with('placement')->findOrFail($entryId);
        $placement = $entry->placement;
        $user = $request->user();

        // Enforce supervisor assignment check
        $isAcademic = ($placement->academic_supervisor_id === $user->id);
        $isCompany = ($user->companySupervisor && $placement->company_supervisor_id === $user->companySupervisor->id);

        if (!$user->isSuperAdmin() && !$isAcademic && !$isCompany) {
            return response()->json(['message' => 'Forbidden. Only assigned supervisors can review this logbook entry.'], 403);
        }

        $entry->update(['status' => $request->action]);

        if ($request->comment) {
            $entry->comments()->create([
                'user_id' => $user->id,
                'comment' => "[{$request->action}] " . $request->comment,
            ]);
        }

        return response()->json($entry);
    }

    public function grade(Request $request, $placementId)
    {
        $request->validate(['grade' => 'required|numeric|min:0|max:100']);
        $placement = Placement::with('student')->findOrFail($placementId);
        $user = $request->user();

        $isAcademic = ($placement->academic_supervisor_id === $user->id);
        $isInstAdmin = ($user->isInstitutionAdmin() && $placement->student?->institution_id === $user->institution_id);

        if (!$user->isSuperAdmin() && !$isAcademic && !$isInstAdmin) {
            return response()->json(['message' => 'Forbidden. Only the assigned academic supervisor or institution admin can submit grades.'], 403);
        }

        $placement->update(['academic_grade' => $request->grade]);
        return response()->json(['message' => 'Grade recorded for placement ' . $placementId, 'placement' => $placement]);
    }

    /**
     * Lock all entries older than 72 hours — called by scheduled command.
     */
    public function lockExpiredEntries(): int
    {
        $cutoff = now()->subHours(72);
        $count  = LogbookEntry::whereNull('locked_at')
            ->where('created_at', '<=', $cutoff)
            ->update(['locked_at' => now(), 'status' => 'submitted']);

        return $count;
    }
}
