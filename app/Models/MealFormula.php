<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class MealFormula extends Model
{
    use HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'name', 'description', 'batch_size_kg',
        'target_cp_percent', 'computed_cp_percent', 'computed_me',
        'computed_calcium_percent', 'computed_phosphorus_percent',
        'cost_per_kg', 'total_batch_cost', 'is_active', 'season',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'batch_size_kg'              => 'float',
        'target_cp_percent'          => 'float',
        'computed_cp_percent'        => 'float',
        'computed_me'                => 'float',
        'computed_calcium_percent'   => 'float',
        'computed_phosphorus_percent'=> 'float',
        'cost_per_kg'                => 'float',
        'total_batch_cost'           => 'float',
        'is_active'                  => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo { return $this->belongsTo(Farm::class); }

    public function ingredients(): HasMany
    {
        return $this->hasMany(MealFormulaIngredient::class, 'meal_formula_id');
    }

    public function ingredientsWithDetails(): HasMany
    {
        return $this->hasMany(MealFormulaIngredient::class, 'meal_formula_id')
                    ->with('ingredient');
    }

    public function scopeActive(Builder $q): Builder { return $q->where('is_active', true); }
}
