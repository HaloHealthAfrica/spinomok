<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MealIngredient extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name', 'dry_matter_percent', 'crude_protein_percent',
        'metabolizable_energy', 'crude_fibre_percent',
        'calcium_percent', 'phosphorus_percent',
        'category', 'max_inclusion_percent', 'notes', 'is_active',
    ];

    protected $casts = [
        'dry_matter_percent'    => 'decimal:2',
        'crude_protein_percent' => 'decimal:2',
        'metabolizable_energy'  => 'decimal:3',
        'crude_fibre_percent'   => 'decimal:2',
        'calcium_percent'       => 'decimal:3',
        'phosphorus_percent'    => 'decimal:3',
        'max_inclusion_percent' => 'decimal:2',
        'is_active'             => 'boolean',
    ];

    public function prices(): HasMany
    {
        return $this->hasMany(MealIngredientPrice::class, 'meal_ingredient_id');
    }

    public function formulaIngredients(): HasMany
    {
        return $this->hasMany(MealFormulaIngredient::class, 'meal_ingredient_id');
    }

    /** Latest price for a given farm. */
    public function latestPriceForFarm(string $farmId): ?float
    {
        $price = $this->prices()
            ->where('farm_id', $farmId)
            ->orderByDesc('effective_from')
            ->value('price_per_kg');

        return $price ? (float) $price : null;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
