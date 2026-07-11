<?php

namespace App\Http\Controllers;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    /**
     * Get all conversations (threads) for the current user.
     */
    public function conversations(Request $request)
    {
        $userId = $request->user()->id;

        // Get unique conversation partners with latest message
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
                    'partner_id'   => $partnerId,
                    'partner_name' => $latest->sender_id === $userId
                        ? $latest->receiver->name
                        : $latest->sender->name,
                    'last_message' => $latest->body,
                    'last_time'    => $latest->created_at,
                    'unread_count' => $unreadCount,
                ];
            })
            ->values();

        return response()->json($conversations);
    }

    /**
     * Get thread (messages) with a specific user.
     */
    public function thread(Request $request, $partnerId)
    {
        $userId = $request->user()->id;

        $messages = Message::with('sender:id,name', 'receiver:id,name')
            ->where(function ($q) use ($userId, $partnerId) {
                $q->where(function ($i) use ($userId, $partnerId) {
                    $i->where('sender_id', $userId)->where('receiver_id', $partnerId);
                })->orWhere(function ($i) use ($userId, $partnerId) {
                    $i->where('sender_id', $partnerId)->where('receiver_id', $userId);
                });
            })
            ->orderBy('created_at')
            ->get();

        // Mark received messages as read
        Message::where('sender_id', $partnerId)
            ->where('receiver_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    /**
     * Send a message to a user.
     */
    public function send(Request $request)
    {
        $request->validate([
            'receiver_id'  => 'required|exists:users,id',
            'body'         => 'required|string|max:2000',
            'context_type' => 'nullable|string',
            'context_id'   => 'nullable|integer',
        ]);

        $message = Message::create([
            'sender_id'    => $request->user()->id,
            'receiver_id'  => $request->receiver_id,
            'body'         => $request->body,
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
