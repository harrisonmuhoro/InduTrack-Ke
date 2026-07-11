<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Application;
use Carbon\Carbon;

class ExpireOffers extends Command
{
    protected $signature = 'offers:expire';
    protected $description = 'Expire accepted offers that haven\'t been confirmed by the student within 5 days';

    public function handle()
    {
        $this->info('Checking for expired offers...');

        $cutoff = now()->subDays(5);
        
        // Find applications that were accepted (offer made) but not acted upon for 5 days
        $count = Application::where('status', 'accepted')
            ->where('updated_at', '<=', $cutoff)
            ->update(['status' => 'expired']);

        $this->info("Expired {$count} offers.");
    }
}
