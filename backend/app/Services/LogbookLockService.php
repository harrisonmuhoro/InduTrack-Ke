<?php

namespace App\Services;

use App\Models\LogbookEntry;
use Illuminate\Support\Facades\DB;

class LogbookLockService
{
    public function lockExpiredEntries(?\DateTimeInterface $now = null): int
    {
        $now = $now ? now()->instance($now) : now();
        $cutoff = $now->copy()->subHours(72);

        return DB::transaction(function () use ($cutoff, $now) {
            $count = 0;
            LogbookEntry::whereNull('locked_at')
                ->where('created_at', '<=', $cutoff)
                ->orderBy('id')
                ->chunkById(100, function ($entries) use (&$count, $now) {
                    foreach ($entries as $entry) {
                        $entry->locked_at = $now;
                        $entry->lock_reason = 'Automatically locked after 72 hours';
                        if ($entry->status === 'draft') {
                            $entry->status = 'submitted';
                            $entry->submitted_at = $entry->submitted_at ?: $now;
                        }
                        $entry->save();
                        $count++;
                    }
                });

            return $count;
        });
    }
}
