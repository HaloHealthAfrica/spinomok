<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalfWeightLog extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'calf_record_id', 'weighed_date', 'weight_kg', 'notes',
    ];

    protected $casts = [
        'weighed_date' => 'date',
        'weight_kg'    => 'float',
    ];

    public function calfRecord(): BelongsTo
    {
        return $this->belongsTo(CalfRecord::class);
    }
}
