<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SystemAnnouncement extends Notification implements ShouldQueue
{
    use Queueable;

    protected string $announcement;

    public function __construct(string $announcement)
    {
        $this->announcement = $announcement;
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('InduTrack KE — System Announcement')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line($this->announcement)
            ->action('Visit InduTrack KE', url('/'))
            ->salutation('— InduTrack KE Admin');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message' => $this->announcement,
            'type' => 'system_announcement',
        ];
    }
}
