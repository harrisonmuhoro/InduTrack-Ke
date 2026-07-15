<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StudentFlagged extends Notification implements ShouldQueue
{
    use Queueable;

    protected string $studentName;
    protected string $reason;

    public function __construct(string $studentName, string $reason)
    {
        $this->studentName = $studentName;
        $this->reason = $reason;
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('InduTrack KE — Student Flagged')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line("Student **{$this->studentName}** has been flagged.")
            ->line("Reason: {$this->reason}")
            ->action('View Compliance Dashboard', url('/institution'))
            ->salutation('— InduTrack KE System');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message' => "Student {$this->studentName} flagged: {$this->reason}",
            'type' => 'student_flagged',
        ];
    }
}
