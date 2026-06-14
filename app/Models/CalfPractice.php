<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalfPractice extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'calf_record_id', 'practice_name', 'due_age_label',
        'completed_date', 'notes',
    ];

    protected $casts = [
        'completed_date' => 'date',
    ];

    public function calfRecord(): BelongsTo
    {
        return $this->belongsTo(CalfRecord::class);
    }
}
