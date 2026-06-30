<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalfHealthEvent extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'calf_record_id', 'event_date', 'disease_name', 'symptoms',
        'severity', 'action_taken', 'vet_called', 'is_resolved',
        'resolved_on', 'outcome', 'notes',
    ];

    protected $casts = [
        'event_date'   => 'date',
        'symptoms'     => 'array',
        'vet_called'   => 'boolean',
        'is_resolved'  => 'boolean',
        'resolved_on'  => 'date',
    ];

    public function calfRecord(): BelongsTo
    {
        return $this->belongsTo(CalfRecord::class);
    }
}
