<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class LogbookEntry extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'locked_at'    => 'datetime',
        'submitted_at' => 'datetime',
        'reviewed_at'  => 'datetime',
        'correction_deadline' => 'datetime',
    ];

    public function placement()
    {
        return $this->belongsTo(Placement::class);
    }

    public function comments()
    {
        return $this->hasMany(LogbookComment::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function reviewHistory()
    {
        return $this->hasMany(LogbookReviewHistory::class, 'logbook_entry_id')->orderBy('reviewed_at');
    }

    /**
     * An entry is editable if:
     * 1. locked_at is null.
     * 2. Status is not finalized or awaiting a controlled review outcome.
     * 3. Created within 72 hours.
     */
    public function isEditable(): bool
    {
        if ($this->locked_at) {
            return false;
        }

        if (in_array($this->status, ['approved', 'rejected', 'flagged'])) {
            return false;
        }

        if ($this->correction_deadline) {
            return now()->lessThanOrEqualTo($this->correction_deadline);
        }

        // The initial 72-hour window begins at creation time.
        return $this->created_at->diffInHours(now()) < 72;
    }

    /**
     * Lock the entry with a reason.
     * Locking only sets locked_at and lock_reason.
     * It must NOT auto-submit a draft — submission is an explicit student action.
     */
    public function lock(string $reason = 'Automatically locked after 72 hours'): void
    {
        $this->update([
            'locked_at'   => now(),
            'lock_reason' => $reason,
            // Status is intentionally NOT changed here. A draft stays draft.
            // A submitted entry stays submitted. Submission requires student consent.
        ]);
    }
}
