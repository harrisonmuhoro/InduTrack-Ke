<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LogbookEntry;

class LockExpiredLogbooks extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'logbook:lock-expired';

    /**
     * The console command description.
     */
    protected $description = 'Idempotently locks logbook entries older than 72 hours.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cutoff = now()->subHours(72);

        $expiredEntries = LogbookEntry::whereNull('locked_at')
            ->where('created_at', '<=', $cutoff)
            ->get();

        $count = 0;
        foreach ($expiredEntries as $entry) {
            $entry->lock('Automatically locked by scheduler after 72 hours');
            $count++;
        }

        $this->info("Locked {$count} expired logbook entries.");

        return Command::SUCCESS;
    }
}
