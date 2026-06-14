<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalfFeedLog extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'calf_record_id', 'log_date', 'milk_litres',
        'starter_kg', 'legends_grams', 'feed_type', 'notes',
    ];

    protected $casts = [
        'log_date'     => 'date',
        'milk_litres'  => 'float',
        'starter_kg'   => 'float',
        'legends_grams'=> 'float',
    ];

    public function calfRecord(): BelongsTo
    {
        return $this->belongsTo(CalfRecord::class);
    }
}
