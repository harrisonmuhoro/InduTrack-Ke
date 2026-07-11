<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WeeklyLog extends Model
{
    protected $fillable = [
        'placement_id', 'company_supervisor_id', 'week_number',
        'tasks_assigned', 'tasks_completed', 'conduct_score',
        'attendance_score', 'specific_feedback', 'has_concern', 'concern_details',
    ];

    protected $casts = [
        'has_concern' => 'boolean',
    ];

    public function placement()
    {
        return $this->belongsTo(Placement::class);
    }

    public function companySupervisor()
    {
        return $this->belongsTo(CompanySupervisor::class, 'company_supervisor_id');
    }
}
