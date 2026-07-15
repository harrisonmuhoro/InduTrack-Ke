<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Placement extends Model
{
    protected $fillable = [
        'student_id', 'company_id', 'period_id',
        'company_supervisor_id', 'academic_supervisor_id', 'status',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function period()
    {
        return $this->belongsTo(AttachmentPeriod::class, 'period_id');
    }

    public function companySupervisor()
    {
        return $this->belongsTo(CompanySupervisor::class, 'company_supervisor_id');
    }

    public function academicSupervisor()
    {
        return $this->belongsTo(User::class, 'academic_supervisor_id');
    }

    public function logbookEntries()
    {
        return $this->hasMany(LogbookEntry::class);
    }

    public function evaluations()
    {
        return $this->hasMany(Evaluation::class);
    }

    public function fieldVisits()
    {
        return $this->hasMany(FieldVisit::class);
    }

    public function weeklyLogs()
    {
        return $this->hasMany(WeeklyLog::class);
    }

    public function flags()
    {
        return $this->hasMany(\App\Models\StudentFlag::class);
    }
}
