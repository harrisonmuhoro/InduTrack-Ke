<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Evaluation extends Model
{
    protected $fillable = [
        'placement_id', 'evaluator_id', 'evaluator_type',
        'score_punctuality', 'score_attitude', 'score_technical',
        'score_teamwork', 'score_communication', 'total_score',
        'remarks', 'would_accept_again', 'submitted_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'would_accept_again' => 'boolean',
    ];

    public function placement()
    {
        return $this->belongsTo(Placement::class);
    }

    public function evaluator()
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }
}
