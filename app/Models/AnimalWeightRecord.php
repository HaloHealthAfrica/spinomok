<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class AnimalWeightRecord extends Model
{
    use HasUuids;
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'measured_on', 'weight_kg',
        'body_condition_score', 'method', 'age_days', 'adg_kg_day',
        'recorded_by', 'notes', 'created_by',
    ];

    protected $casts = [
        'measured_on'         => 'date',
        'weight_kg'           => 'decimal:2',
        'body_condition_score'=> 'decimal:1',
        'adg_kg_day'          => 'decimal:3',
        'age_days'            => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo   { return $this->belongsTo(Farm::class); }
    public function animal(): BelongsTo { return $this->belongsTo(Animal::class); }

    public function scopeByAnimal(Builder $q, string $animalId): Builder
    {
        return $q->where('animal_id', $animalId);
    }

    public function scopeRecent(Builder $q, int $months = 12): Builder
    {
        return $q->where('measured_on', '>=', now()->subMonths($months)->toDateString());
    }
}
