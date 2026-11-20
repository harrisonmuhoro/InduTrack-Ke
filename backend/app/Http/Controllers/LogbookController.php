<?php

namespace App\Http\Controllers;

use App\Models\LogbookEntry;
use App\Models\Placement;
use App\Models\Student;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Database\UniqueConstraintViolationException;

class LogbookController extends Controller
{
    /**
     * Create a logbook entry for student's active placement.
     */
    public function store(Request $request)
    {
        $request->validate([
            'entry_date'      => 'required|date',
            'week_number'     => 'required|integer|min:1',
            'activities'      => 'required|string',
            'lessons_learned' => 'nullable|string',
            'challenges'      => 'nullable|string',
            'plan_next_week'  => 'nullable|string',
            'status'          => 'nullable|in:draft,submitted',
        ]);

        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) {
            return response()->json(['message' => 'Forbidden. Only students can create logbook entries.'], 403);
        }

        $placement = Placement::where('student_id', $student->id)
            ->where('status', 'active')
            ->first();

        if (!$placement) {
            return response()->json(['message' => 'No active placement found for logbook submission.'], 422);
        }

        // Prevent duplicate week entries at application layer
        $existing = LogbookEntry::where('placement_id', $placement->id)
            ->where('week_number', $request->week_number)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'An entry for this week already exists.'], 409);
        }

        $status = $request->input('status', 'draft');

        try {
            $entry = LogbookEntry::create([
                'placement_id'    => $placement->id,
                'entry_date'      => $request->entry_date,
                'week_number'     => $request->week_number,
                'activities'      => $request->activities,
                'lessons_learned' => $request->lessons_learned,
                'challenges'      => $request->challenges,
                'plan_next_week'  => $request->plan_next_week,
                'status'          => $status,
                'submitted_at'    => $status === 'submitted' ? now() : null,
            ]);
        } catch (UniqueConstraintViolationException $e) {
            return response()->json(['message' => 'An entry for this week already exists.'], 409);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'logbook_entries_placement_week_unique')) {
                return response()->json(['message' => 'An entry for this week already exists.'], 409);
            }
            throw $e;
        }

        return response()->json($entry, 201);
    }

    /**
     * Update logbook entry within allowed 72-hour window.
     */
    public function update(Request $request, $id)
    {
        $entry = LogbookEntry::with('placement.student')->findOrFail($id);

        // Enforce policy authorization (owner student and within editable 72h window)
        if (Gate::denies('update', $entry)) {
            $reason = $entry->locked_at ? 'Entry is locked.' : 'Editing window (72 hours) has expired or entry is already approved.';
            return response()->json(['message' => "Forbidden. {$reason}"], 403);
        }

        $request->validate([
            'activities'      => 'sometimes|required|string',
            'lessons_learned' => 'nullable|string',
            'challenges'      => 'nullable|string',
            'plan_next_week'  => 'nullable|string',
            'status'          => 'sometimes|in:draft,submitted',
        ]);

        // Prevent modification of locked or approval fields via mass-assignment
        $updateData = $request->only([
            'activities', 'lessons_learned', 'challenges', 'plan_next_week',
        ]);

        if ($request->has('status') && $request->status === 'submitted' && $entry->status === 'draft') {
            $updateData['status'] = 'submitted';
            $updateData['submitted_at'] = now();
        }

        $entry->update($updateData);

        return response()->json($entry);
    }

    /**
     * Submit a draft logbook entry for supervisor review.
     */
    public function submit(Request $request, $id)
    {
        $entry = LogbookEntry::with('placement.student')->findOrFail($id);

        if (Gate::denies('update', $entry)) {
            return response()->json(['message' => 'Forbidden. Logbook entry cannot be submitted because it is locked, approved, or not owned.'], 403);
        }

        if ($entry->status === 'submitted') {
            return response()->json(['message' => 'Logbook entry is already submitted.', 'entry' => $entry]);
        }

        $entry->update([
            'status'       => 'submitted',
            'submitted_at' => now(),
        ]);

        return response()->json(['message' => 'Logbook entry submitted successfully.', 'entry' => $entry]);
    }

    /**
     * Get entries for the active student placement.
     */
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
            ->with(['comments.user:id,name', 'reviewer:id,name'])
            ->orderBy('week_number')
            ->get()
            ->map(function ($entry) {
                $entry->is_editable = $entry->isEditable();
                $entry->hours_left = max(0, 72 - $entry->created_at->diffInHours(now()));
                return $entry;
            });

        return response()->json($entries);
    }

    /**
     * Add a comment to a logbook entry.
     * Note: Does NOT automatically change entry status to approved.
     */
    public function addComment(Request $request, $entryId)
    {
        $request->validate(['comment' => 'required|string|max:1000']);
        $entry = LogbookEntry::with('placement.student')->findOrFail($entryId);
        $user = $request->user();

        // Enforce policy authorization (LogbookEntryPolicy::addComment)
        $this->authorize('addComment', $entry);

        $comment = $entry->comments()->create([
            'user_id' => $user->id,
            'comment' => $request->comment,
        ]);

        return response()->json($comment->load('user:id,name'), 201);
    }

    /**
     * Explicit review action: approved, rejected, flagged.
     * Only assigned supervisors may execute this formal action.
     * Enforces valid state transitions and records reviewer ID + timestamp.
     */
    public function reviewEntry(Request $request, $entryId)
    {
        $request->validate([
            'action'  => 'required|in:approved,rejected,flagged',
            'comment' => 'nullable|string|max:1000',
        ]);

        $entry = LogbookEntry::with('placement')->findOrFail($entryId);
        $user = $request->user();

        // Enforce policy authorization (LogbookEntryPolicy::review)
        $this->authorize('review', $entry);

        // Must be in submitted or flagged state to be reviewed
        // An approved or rejected entry cannot be arbitrarily flipped
        if ($entry->status === 'draft') {
            return response()->json(['message' => 'Cannot review a draft logbook entry. The student must submit it first.'], 422);
        }

        if ($entry->status === 'approved') {
            return response()->json(['message' => 'This logbook entry has already been approved and cannot be altered.'], 422);
        }

        $entry->update([
            'status'      => $request->action,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        if ($request->comment) {
            $entry->comments()->create([
                'user_id' => $user->id,
                'comment' => "[{$request->action}] " . $request->comment,
            ]);
        }

        return response()->json($entry->load(['comments.user:id,name', 'reviewer:id,name']));
    }

    /**
     * Academic supervisor grades placement.
     */
    public function grade(Request $request, $placementId)
    {
        $request->validate(['grade' => 'required|numeric|min:0|max:100']);
        $placement = Placement::with('student')->findOrFail($placementId);

        // Enforce policy: only assigned academic supervisor may grade (PlacementPolicy::grade)
        $this->authorize('grade', $placement);

        $placement->update(['academic_grade' => $request->grade]);
        return response()->json(['message' => 'Grade recorded for placement ' . $placementId, 'placement' => $placement]);
    }

    /**
     * Lock all entries older than 72 hours.
     */
    public function lockExpiredEntries(): int
    {
        $cutoff = now()->subHours(72);
        $entries = LogbookEntry::whereNull('locked_at')
            ->where('created_at', '<=', $cutoff)
            ->get();

        $count = 0;
        foreach ($entries as $entry) {
            $entry->lock('Automatically locked after 72 hours');
            $count++;
        }

        return $count;
    }
}
