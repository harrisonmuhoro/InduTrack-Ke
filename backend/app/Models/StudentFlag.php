<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentFlag extends Model
{
    protected $fillable = [
        'placement_id', 'flagged_by', 'severity', 'reason', 'details', 'resolved', 'resolved_at',
    ];

    protected $casts = [
        'resolved' => 'boolean',
        'resolved_at' => 'datetime',
    ];

    public function placement()
    {
        return $this->belongsTo(Placement::class);
    }

    public function flagger()
    {
        return $this->belongsTo(User::class, 'flagged_by');
    }
}
