<?php

namespace App\Http\Controllers;

use App\Models\LogbookEntry;
use App\Models\Placement;
use App\Models\Student;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use App\Models\LogbookReviewHistory;
use App\Services\LogbookLockService;

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

    /** Move a rejected entry back to draft so the student can correct and resubmit it. */
    public function resubmit(Request $request, $id)
    {
        // Eager-load placement for the policy check; row-lock inside the transaction.
        $entry = LogbookEntry::with('placement.student')->findOrFail($id);
        $this->authorize('resubmit', $entry);

        DB::transaction(function () use ($entry, $request) {
            // Row-level lock — prevents concurrent resubmit requests from creating
            // duplicate history rows or producing inconsistent state.
            $entry = LogbookEntry::lockForUpdate()->findOrFail($entry->id);

            // Re-check authorization after acquiring the lock (double-check pattern).
            $this->authorize('resubmit', $entry);

            $actor = $request->user();

            LogbookReviewHistory::create([
                'logbook_entry_id' => $entry->id,
                // actor_* identifies who performed this action and in what capacity
                'actor_id'         => $actor->id,
                'actor_role'       => 'student',
                'event_type'       => 'resubmit',
                // reviewer_id stays null — this is NOT a formal academic review decision
                'reviewer_id'      => null,
                'previous_status'  => $entry->status,
                'new_status'       => 'draft',
                'comment'          => 'Student reopened the rejected entry for correction.',
                'metadata'         => ['ip' => $request->ip(), 'user_agent' => $request->userAgent()],
                'reviewed_at'      => now(),
            ]);

            $entry->update([
                'status'              => 'draft',
                'submitted_at'        => null,
                'reviewed_by'         => null,
                'reviewed_at'         => null,
                // Preserve correction_deadline — it still governs the edit window.
                // The lock service will enforce it when the deadline passes.
            ]);
        });

        return response()->json(['message' => 'Rejected entry reopened as a draft.', 'entry' => $entry->fresh()]);
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
            ->with(['comments.user:id,name', 'reviewer:id,name', 'reviewHistory.reviewer:id,name'])
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

        DB::transaction(function () use ($entry, $user, $request) {
            $entry = LogbookEntry::with('placement')->lockForUpdate()->findOrFail($entry->id);
            $this->authorize('review', $entry);
            $allowedTransitions = [
                'submitted' => ['approved', 'rejected', 'flagged'],
                'flagged' => ['approved', 'rejected'],
            ];
            if (! in_array($request->action, $allowedTransitions[$entry->status] ?? [], true)) {
                abort(422, "Cannot transition a {$entry->status} entry to {$request->action}.");
            }
            $reviewedAt = now();
            LogbookReviewHistory::create([
                'logbook_entry_id' => $entry->id,
                // Both reviewer_id (legacy) and actor_* (generic) are populated for formal decisions.
                'reviewer_id'      => $user->id,
                'actor_id'         => $user->id,
                'actor_role'       => 'academic_supervisor',
                'event_type'       => 'review',
                'previous_status'  => $entry->status,
                'new_status'       => $request->action,
                'comment'          => $request->comment,
                'metadata'         => ['ip' => $request->ip(), 'user_agent' => $request->userAgent()],
                'reviewed_at'      => $reviewedAt,
            ]);

            $entry->update([
                'status' => $request->action,
                'reviewed_by' => $user->id,
                'reviewed_at' => $reviewedAt,
                'correction_deadline' => $request->action === 'rejected' ? $reviewedAt->copy()->addHours(72) : null,
            ]);

            if ($request->comment) {
                $entry->comments()->create([
                    'user_id' => $user->id,
                    'comment' => "[{$request->action}] " . $request->comment,
                ]);
            }
        });

        return response()->json($entry->fresh()->load(['comments.user:id,name', 'reviewer:id,name', 'reviewHistory.reviewer:id,name']));
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
        return app(LogbookLockService::class)->lockExpiredEntries();
    }
}
