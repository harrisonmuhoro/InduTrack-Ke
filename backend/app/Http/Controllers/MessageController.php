<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use App\Models\Placement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    /**
     * Check if sender and receiver have an authorized messaging relationship:
     * - Super Admin can communicate with anyone.
     * - Student ↔ Assigned Company Supervisor on active placement.
     * - Student ↔ Assigned Academic Supervisor on active placement.
     * - Student ↔ Institution Admin of their institution.
     * - Supervisor ↔ Institution Admin of same institution.
     */
    private function canCommunicate(User $sender, User $receiver): bool
    {
        if ($sender->isSuperAdmin() || $receiver->isSuperAdmin()) {
            return true;
        }

        // Cannot message oneself
        if ($sender->id === $receiver->id) {
            return false;
        }

        // Student communication
        if ($sender->isStudent()) {
            return $this->isStudentAuthorizedWith($sender, $receiver);
        }

        if ($receiver->isStudent()) {
            return $this->isStudentAuthorizedWith($receiver, $sender);
        }

        // Academic Supervisor & Institution Admin communication (same institution)
        if (($sender->isAcademicSupervisor() && $receiver->isInstitutionAdmin()) ||
            ($sender->isInstitutionAdmin() && $receiver->isAcademicSupervisor())) {
            return $sender->institution_id && ($sender->institution_id === $receiver->institution_id);
        }

        return false;
    }

    private function isStudentAuthorizedWith(User $studentUser, User $otherUser): bool
    {
        $student = $studentUser->student;
        if (!$student) {
            return false;
        }

        // Check if other user is the student's institution admin
        if ($otherUser->isInstitutionAdmin() && $otherUser->institution_id === $student->institution_id) {
            return true;
        }

        // Check active/completed placements for assigned supervisors
        $placements = Placement::where('student_id', $student->id)->get();
        foreach ($placements as $placement) {
            // Academic supervisor
            if ($otherUser->isAcademicSupervisor() && $placement->academic_supervisor_id === $otherUser->id) {
                return true;
            }

            // Company supervisor
            if ($otherUser->isCompanySupervisor() && $otherUser->companySupervisor && 
                $placement->company_supervisor_id === $otherUser->companySupervisor->id) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get all conversations (threads) for the current user.
     */
    public function conversations(Request $request)
    {
        $userId = $request->user()->id;

        $conversations = Message::with('sender:id,name', 'receiver:id,name')
            ->where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)->orWhere('receiver_id', $userId);
            })
            ->orderByDesc('created_at')
            ->get()
            ->groupBy(function ($msg) use ($userId) {
                return $msg->sender_id === $userId ? $msg->receiver_id : $msg->sender_id;
            })
            ->map(function ($msgs, $partnerId) use ($userId) {
                $latest = $msgs->first();
                $unreadCount = $msgs->where('receiver_id', $userId)->whereNull('read_at')->count();
                return [
                    'partner_id'   => (int) $partnerId,
                    'partner_name' => $latest->sender_id === $userId
                        ? ($latest->receiver->name ?? 'User')
                        : ($latest->sender->name ?? 'User'),
                    'last_message' => $latest->body,
                    'last_time'    => $latest->created_at,
                    'unread_count' => $unreadCount,
                ];
            })
            ->values();

        return response()->json($conversations);
    }

    /**
     * Get thread (messages) with a specific authorized user, paginated.
     */
    public function thread(Request $request, $partnerId)
    {
        $user = $request->user();
        $partner = User::findOrFail($partnerId);

        // Security check: Must have authorized communication relationship
        if (!$this->canCommunicate($user, $partner)) {
            return response()->json(['message' => 'Forbidden. You are not authorized to message this user.'], 403);
        }

        $perPage = min(100, max(10, (int) $request->input('per_page', 50)));

        $messages = Message::with('sender:id,name', 'receiver:id,name')
            ->where(function ($q) use ($user, $partnerId) {
                $q->where(function ($i) use ($user, $partnerId) {
                    $i->where('sender_id', $user->id)->where('receiver_id', $partnerId);
                })->orWhere(function ($i) use ($user, $partnerId) {
                    $i->where('sender_id', $partnerId)->where('receiver_id', $user->id);
                });
            })
            ->orderBy('created_at', 'asc')
            ->paginate($perPage);

        // Mark received unread messages as read
        Message::where('sender_id', $partnerId)
            ->where('receiver_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    /**
     * Send a message to an authorized recipient.
     */
    public function send(Request $request)
    {
        $request->validate([
            'receiver_id'  => 'required|exists:users,id',
            'body'         => 'required|string|min:1|max:2000',
            'context_type' => 'nullable|string',
            'context_id'   => 'nullable|integer',
        ]);

        $sender = $request->user();
        $receiver = User::findOrFail($request->receiver_id);

        // Strict authorization check: Only communicate with authorized placement contacts
        if (!$this->canCommunicate($sender, $receiver)) {
            return response()->json(['message' => 'Forbidden. You do not have an authorized relationship to message this user.'], 403);
        }

        $message = Message::create([
            'sender_id'    => $sender->id,
            'receiver_id'  => $receiver->id,
            'body'         => trim($request->body),
            'context_type' => $request->context_type,
            'context_id'   => $request->context_id,
        ]);

        return response()->json($message->load('sender:id,name', 'receiver:id,name'), 201);
    }

    /**
     * Count unread messages for the current user.
     */
    public function unreadCount(Request $request)
    {
        $count = Message::where('receiver_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['unread' => $count]);
    }
}
