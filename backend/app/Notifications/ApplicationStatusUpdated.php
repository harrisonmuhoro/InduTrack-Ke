<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Application;

class ApplicationStatusUpdated extends Notification implements ShouldQueue
{
    use Queueable;

    public $application;

    public function __construct(Application $application)
    {
        $this->application = $application;
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $status = ucfirst($this->application->status);
        return (new MailMessage)
                    ->subject("Application Status Update: $status")
                    ->line("Your application status for {$this->application->slot->company->name} has been updated to: $status.")
                    ->action('View Dashboard', url('/student'))
                    ->line('Thank you for using InduTrack KE!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'application_id' => $this->application->id,
            'status' => $this->application->status,
            'company_name' => $this->application->slot->company->name,
            'message' => "Application status updated to " . $this->application->status,
        ];
    }
}
