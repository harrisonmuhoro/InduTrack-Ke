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
        'locked_at' => 'datetime',
    ];

    public function placement()
    {
        return $this->belongsTo(Placement::class);
    }

    public function comments()
    {
        return $this->hasMany(LogbookComment::class);
    }

    /**
     * An entry is editable if locked_at is null AND created_at is within 72 hours.
     */
    public function isEditable(): bool
    {
        if ($this->locked_at) {
            return false;
        }
        return $this->created_at->diffInHours(now()) < 72;
    }

    /**
     * Lock the entry (called manually or by scheduler).
     */
    public function lock(): void
    {
        $this->update(['locked_at' => now(), 'status' => 'submitted']);
    }
}
