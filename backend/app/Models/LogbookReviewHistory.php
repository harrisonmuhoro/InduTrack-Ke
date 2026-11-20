<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LogbookReviewHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'logbook_entry_id',
        // Legacy column — preserved for backward compatibility; set for formal reviews.
        'reviewer_id',
        // Generic actor columns (preferred for all new code)
        'actor_id',
        'actor_role',
        'event_type',
        // Transition fields
        'previous_status', 'new_status',
        'comment', 'metadata', 'reviewed_at',
    ];

    protected $casts = [
        'metadata'    => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function entry()
    {
        return $this->belongsTo(LogbookEntry::class, 'logbook_entry_id');
    }

    /** The academic supervisor who performed a formal review decision. */
    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    /** The user who performed the action (reviewer OR student). */
    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
