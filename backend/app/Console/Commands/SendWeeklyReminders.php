<?php

namespace App\Console\Commands;

use App\Models\Placement;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

#[Signature('logbooks:remind')]
#[Description('Send weekly logbook reminders to students with missing entries')]
class SendWeeklyReminders extends Command
{
    public function handle()
    {
        $this->info('Starting weekly logbook reminders...');

        $activePlacements = Placement::where('status', 'active')->with('student.user')->get();
        $count = 0;

        foreach ($activePlacements as $placement) {
            // Find if there's an entry for the last 7 days
            $hasRecentEntry = $placement->logbookEntries()
                ->where('created_at', '>=', now()->subDays(7))
                ->exists();

            if (!$hasRecentEntry) {
                $user = $placement->student->user;
                
                // Mock SMS/Email Sending
                $message = "Hi {$user->name}, reminder to submit your logbook entry for this week on InduTrack KE.";
                
                Log::info("SMS SENT to {$user->email}: {$message}");
                
                $count++;
            }
        }

        $this->info("Reminders sent to {$count} students.");
    }
}
