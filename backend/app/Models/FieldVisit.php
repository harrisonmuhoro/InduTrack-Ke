<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FieldVisit extends Model
{
    protected $fillable = [
        'academic_supervisor_id', 'placement_id', 'visit_date', 'visit_time',
        'status', 'company_environment_notes', 'student_performance_notes',
        'recommendations', 'gps_latitude', 'gps_longitude',
    ];

    protected $casts = [
        'visit_date' => 'date',
    ];

    public function placement()
    {
        return $this->belongsTo(Placement::class);
    }

    public function academicSupervisor()
    {
        return $this->belongsTo(User::class, 'academic_supervisor_id');
    }
}
