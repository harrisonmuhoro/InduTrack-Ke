<?php

namespace App\Console\Commands;

use App\Models\Placement;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

#[Signature('logbooks:escalate')]
#[Description('Process logbook escalations for 2 or 3 missing weeks')]
class ProcessLogbookEscalations extends Command
{
    public function handle()
    {
        $this->info('Processing logbook escalations...');
        $placements = Placement::where('status', 'active')->with('student.user', 'logbookEntries', 'flags')->get();

        foreach ($placements as $placement) {
            $latestEntry = $placement->logbookEntries()->latest('created_at')->first();
            $lastActivityDate = $latestEntry ? $latestEntry->created_at : $placement->created_at;
            
            $daysMissing = now()->diffInDays($lastActivityDate);
            
            if ($daysMissing >= 14 && $daysMissing < 21) {
                $this->createFlag($placement, 'Missing logbooks for 2 consecutive weeks');
            } elseif ($daysMissing >= 21) {
                $this->createFlag($placement, 'Missing logbooks for 3+ consecutive weeks');
                Log::info("ESCALATION ALERT: Student {$placement->student->user->name} has missed 3 weeks of logbooks. Notify Admin.");
            }
        }
        $this->info('Escalations processed.');
    }

    private function createFlag($placement, $reason)
    {
        $exists = $placement->flags()
            ->where('reason', 'like', 'Missing logbooks%')
            ->where('resolved', false)
            ->exists();
            
        if (!$exists) {
            $placement->flags()->create([
                'flagged_by' => clone $placement->student->user_id, // fallback or use system id, let's use 1
                'severity' => 'high',
                'reason' => $reason,
                'details' => 'Automated escalation flag.',
                'resolved' => false,
            ]);
            // Force flagged_by to 1 to simulate a system user
            $placement->flags()->latest()->first()->update(['flagged_by' => 1]);
        }
    }
}
