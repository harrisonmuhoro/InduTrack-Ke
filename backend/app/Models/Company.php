<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function attachmentSlots()
    {
        return $this->hasMany(AttachmentSlot::class);
    }

    public function ratings()
    {
        return $this->hasMany(CompanyRating::class);
    }

    public function supervisors()
    {
        return $this->hasMany(CompanySupervisor::class);
    }
}
