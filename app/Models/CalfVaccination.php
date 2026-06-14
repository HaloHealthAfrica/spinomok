<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalfVaccination extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'calf_record_id', 'vaccine_name', 'due_date',
        'completed_date', 'administered_by', 'notes',
    ];

    protected $casts = [
        'due_date'       => 'date',
        'completed_date' => 'date',
    ];

    public function calfRecord(): BelongsTo
    {
        return $this->belongsTo(CalfRecord::class);
    }

    public function getIsOverdueAttribute(): bool
    {
        return is_null($this->completed_date) && $this->due_date->isPast();
    }

    public function getIsDueSoonAttribute(): bool
    {
        return is_null($this->completed_date)
            && ! $this->due_date->isPast()
            && $this->due_date->diffInDays(now()) <= 7;
    }
}
