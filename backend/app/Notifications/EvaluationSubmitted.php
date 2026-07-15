<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EvaluationSubmitted extends Notification implements ShouldQueue
{
    use Queueable;

    protected string $evaluatorName;
    protected string $evaluatorType;

    public function __construct(string $evaluatorName, string $evaluatorType)
    {
        $this->evaluatorName = $evaluatorName;
        $this->evaluatorType = $evaluatorType;
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('InduTrack KE — New Evaluation Submitted')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line("A new evaluation has been submitted by **{$this->evaluatorName}** ({$this->evaluatorType}).")
            ->action('View Your Results', url('/student/results'))
            ->salutation('— InduTrack KE System');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message' => "Evaluation submitted by {$this->evaluatorName} ({$this->evaluatorType}).",
            'type' => 'evaluation_submitted',
        ];
    }
}
