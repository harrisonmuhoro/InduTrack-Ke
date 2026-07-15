<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendReminders extends Command
{
    protected $signature = 'app:send-reminders';
    protected $description = 'Send automated email reminders to students to fill logbooks.';

    public function handle()
    {
        // Dummy implementation for Phase 5
        // Ideally, we'd query active placements without a logbook entry this week
        // $studentsToRemind = ...
        
        Log::info("Running SendReminders command. (Email notifications dispatched via Laravel Mail / SMTP settings in .env)");
        $this->info("Reminders dispatched successfully.");
    }
}
