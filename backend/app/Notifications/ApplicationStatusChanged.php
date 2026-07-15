<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationStatusChanged extends Notification implements ShouldQueue
{
    use Queueable;

    protected string $companyName;
    protected string $status;

    public function __construct(string $companyName, string $status)
    {
        $this->companyName = $companyName;
        $this->status = $status;
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject("InduTrack KE — Application {$this->status}")
            ->greeting('Hello ' . $notifiable->name . ',');

        if ($this->status === 'accepted') {
            $mail->line("Congratulations! Your application to **{$this->companyName}** has been **accepted**.")
                 ->line('Please log in to view your offer letter and accept the placement.')
                 ->action('View My Applications', url('/student/applications'));
        } elseif ($this->status === 'rejected') {
            $mail->line("Unfortunately, your application to **{$this->companyName}** has been **rejected**.")
                 ->line('Don\'t give up — keep exploring other available slots!')
                 ->action('Browse More Slots', url('/student'));
        } else {
            $mail->line("Your application to **{$this->companyName}** has been updated to: **{$this->status}**.")
                 ->action('View My Applications', url('/student/applications'));
        }

        return $mail->salutation('— InduTrack KE System');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message' => "Your application to {$this->companyName} is now: {$this->status}.",
            'type' => 'application_status_changed',
        ];
    }
}
