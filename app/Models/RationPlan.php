<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RationPlan extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'name', 'animal_group', 'production_level',
        'head_count', 'valid_from', 'valid_until',
        'target_milk_yield_l', 'animal_weight_kg',
        'total_dm_kg_per_head', 'computed_cp_percent', 'computed_me',
        'cost_per_head_per_day', 'notes', 'created_by',
    ];

    protected $casts = [
        'valid_from'            => 'date',
        'valid_until'           => 'date',
        'target_milk_yield_l'   => 'decimal:2',
        'animal_weight_kg'      => 'decimal:2',
        'total_dm_kg_per_head'  => 'decimal:3',
        'computed_cp_percent'   => 'decimal:2',
        'computed_me'           => 'decimal:3',
        'cost_per_head_per_day' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo { return $this->belongsTo(Farm::class); }

    public function components(): HasMany
    {
        return $this->hasMany(RationPlanComponent::class, 'ration_plan_id');
    }
}
