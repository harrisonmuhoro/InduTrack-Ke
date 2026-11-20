<?php

namespace App\Services;

use App\Models\LogbookEntry;
use Illuminate\Support\Facades\DB;

class LogbookLockService
{
    /**
     * Lock all logbook entries whose editing window has definitively closed.
     *
     * Effective editing deadline rules (priority order):
     *
     * 1. If the entry has a correction_deadline (set on rejection), that deadline
     *    governs — the entry is ONLY locked when correction_deadline has passed.
     *    The original created_at MUST NOT override an active correction window.
     *
     * 2. If there is no correction_deadline, the standard 72-hour window from
     *    created_at governs.
     *
     * Entries that are already locked or approved are always excluded.
     */
    public function lockExpiredEntries(?\DateTimeInterface $now = null): int
    {
        $now    = $now ? now()->instance($now) : now();
        $cutoff = $now->copy()->subHours(72);

        return DB::transaction(function () use ($cutoff, $now) {
            $count = 0;

            // ── Case 1: entries with an active correction_deadline that has now passed.
            // These must be evaluated against correction_deadline, NOT created_at.
            LogbookEntry::whereNull('locked_at')
                ->whereNotNull('correction_deadline')
                ->where('correction_deadline', '<=', $now)
                ->whereNotIn('status', ['approved'])
                ->orderBy('id')
                ->chunkById(100, function ($entries) use (&$count, $now) {
                    foreach ($entries as $entry) {
                        $entry->locked_at   = $now;
                        $entry->lock_reason = 'Automatically locked after 72 hours';
                        $entry->save();
                        $count++;
                    }
                });

            // ── Case 2: entries with NO correction_deadline — standard 72h from created_at.
            // A rejected entry with an active (future) correction_deadline is never caught
            // here even if created_at is older than 72 hours.
            LogbookEntry::whereNull('locked_at')
                ->whereNull('correction_deadline')
                ->where('created_at', '<=', $cutoff)
                ->whereNotIn('status', ['approved'])
                ->orderBy('id')
                ->chunkById(100, function ($entries) use (&$count, $now) {
                    foreach ($entries as $entry) {
                        $entry->locked_at   = $now;
                        $entry->lock_reason = 'Automatically locked after 72 hours';
                        $entry->save();
                        $count++;
                    }
                });

            return $count;
        });
    }
}
