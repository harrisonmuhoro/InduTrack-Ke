<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Placement;
use App\Models\StudentFlag;
use App\Notifications\LogbookReminder;
use Carbon\Carbon;

class WeeklyLogbookReminder extends Command
{
    protected $signature = 'logbooks:reminder';
    protected $description = 'Send weekly email reminders for logbooks and flag inactive students';

    public function handle()
    {
        $this->info('Checking for inactive placements...');

        $cutoff = now()->subWeeks(2);
        
        $placements = Placement::with('student.user')
            ->where('status', 'active')
            ->whereDoesntHave('logbookEntries', function ($q) use ($cutoff) {
                $q->where('created_at', '>=', $cutoff);
            })
            ->get();

        $notified = 0;

        foreach ($placements as $placement) {
            // Send email notification to the student via Resend
            if ($placement->student && $placement->student->user) {
                $placement->student->user->notify(new LogbookReminder());
                $notified++;
                $this->info("Sent reminder email to {$placement->student->user->email}");
            }

            // Check if already flagged for this reason recently
            $existingFlag = StudentFlag::where('placement_id', $placement->id)
                ->where('reason', 'inactive_logbook')
                ->where('resolved', false)
                ->exists();

            if (!$existingFlag) {
                StudentFlag::create([
                    'placement_id' => $placement->id,
                    'flagged_by'   => 1,
                    'severity'     => 'warning',
                    'reason'       => 'inactive_logbook',
                    'details'      => 'Student has not submitted a logbook entry in over 2 weeks.',
                ]);
                $this->info("Flagged placement ID {$placement->id} for inactivity.");
            }
        }

        $this->info("Logbook reminders completed. Emailed {$notified} students.");
    }
}
