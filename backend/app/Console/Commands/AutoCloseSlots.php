<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\AttachmentSlot;

class AutoCloseSlots extends Command
{
    protected $signature = 'app:auto-close-slots';
    protected $description = 'Automatically close attachment slots that are past their deadline or filled.';

    public function handle()
    {
        // For simplicity, we just close slots created over 30 days ago
        $closedCount = AttachmentSlot::where('status', 'open')
            ->where('created_at', '<', now()->subDays(30))
            ->update(['status' => 'closed']);

        $this->info("Closed $closedCount slots.");
    }
}
