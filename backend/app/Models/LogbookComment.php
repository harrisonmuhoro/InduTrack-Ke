<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LogbookComment extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function entry()
    {
        return $this->belongsTo(LogbookEntry::class, 'logbook_entry_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
