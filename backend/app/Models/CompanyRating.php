<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyRating extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'is_anonymous' => 'boolean',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function rater()
    {
        return $this->belongsTo(User::class, 'rater_id');
    }
}
