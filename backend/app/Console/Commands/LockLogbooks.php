<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LogbookLockService;

class LockLogbooks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'logbooks:lock';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Locks logbook entries older than 72 hours';

    /**
     * Execute the console command.
     */
    public function handle(LogbookLockService $locker)
    {
        $this->info('Locking expired logbook entries...');
        $count = $locker->lockExpiredEntries();
        $this->info("Successfully locked {$count} logbook entries.");
    }
}
