<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class CalfFeedingRecord extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'calf_feeding_records';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'fed_on', 'session', 'feed_type',
        'quantity', 'unit', 'milk_source_animal_id', 'cost',
        'fed_by', 'notes', 'created_by',
    ];

    protected $casts = [
        'fed_on'   => 'date',
        'quantity' => 'float',
        'cost'     => 'float',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo        { return $this->belongsTo(Farm::class); }
    public function calf(): BelongsTo        { return $this->belongsTo(Animal::class, 'animal_id'); }
    public function milkSource(): BelongsTo  { return $this->belongsTo(Animal::class, 'milk_source_animal_id'); }

    public function scopeForDate(Builder $q, string $date): Builder
    {
        return $q->whereDate('fed_on', $date);
    }

    public function scopeForCalf(Builder $q, string $animalId): Builder
    {
        return $q->where('animal_id', $animalId);
    }
}
