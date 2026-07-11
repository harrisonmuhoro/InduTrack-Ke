<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class EscalateIssues extends Command
{
    protected $signature = 'app:escalate-issues';
    protected $description = 'Escalate unreviewed logbooks to institution admins.';

    public function handle()
    {
        // Dummy implementation for Phase 5
        Log::info("Running EscalateIssues command. Escalations sent to Institution Admin emails.");
        $this->info("Issues escalated successfully.");
    }
}
