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
            ->firstOrFail();

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
        $entry = LogbookEntry::findOrFail($id);

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
        $entry = LogbookEntry::findOrFail($entryId);

        $comment = $entry->comments()->create([
            'user_id' => $request->user()->id,
            'comment' => $request->comment,
        ]);

        // Auto-approve entry when supervisor comments
        if (in_array($entry->status, ['draft', 'submitted'])) {
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

        $entry = LogbookEntry::findOrFail($entryId);
        $entry->update(['status' => $request->action]);

        if ($request->comment) {
            $entry->comments()->create([
                'user_id' => $request->user()->id,
                'comment' => "[{$request->action}] " . $request->comment,
            ]);
        }

        return response()->json($entry);
    }

    public function grade(Request $request, $placementId)
    {
        $request->validate(['grade' => 'required|numeric|min:0|max:100']);
        $placement = Placement::findOrFail($placementId);
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
