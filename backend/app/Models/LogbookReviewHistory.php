<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LogbookReviewHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'logbook_entry_id', 'reviewer_id', 'previous_status', 'new_status',
        'comment', 'metadata', 'reviewed_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function entry()
    {
        return $this->belongsTo(LogbookEntry::class, 'logbook_entry_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
