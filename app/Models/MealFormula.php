<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class MealFormula extends Model
{
    use SoftDeletes;

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
        'batch_size_kg'              => 'decimal:2',
        'target_cp_percent'          => 'decimal:2',
        'computed_cp_percent'        => 'decimal:2',
        'computed_me'                => 'decimal:3',
        'computed_calcium_percent'   => 'decimal:3',
        'computed_phosphorus_percent'=> 'decimal:3',
        'cost_per_kg'                => 'decimal:3',
        'total_batch_cost'           => 'decimal:2',
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
