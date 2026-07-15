<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LogbookReminder extends Notification implements ShouldQueue
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('InduTrack KE — Logbook Reminder')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('This is a friendly reminder that you have not submitted a logbook entry in the past 2 weeks.')
            ->line('Regular logbook submissions are required to maintain compliance with your attachment program.')
            ->action('Submit Logbook Entry', url('/student/logbook'))
            ->line('If you have already submitted your entry, please disregard this message.')
            ->salutation('— InduTrack KE Team');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message' => 'You have not submitted a logbook entry in over 2 weeks. Please submit your logbook.',
            'type' => 'logbook_reminder',
        ];
    }
}
