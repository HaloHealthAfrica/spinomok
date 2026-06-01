<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealFormulaIngredient extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'meal_formula_id', 'meal_ingredient_id', 'inclusion_percent', 'quantity_kg', 'cost',
    ];

    protected $casts = [
        'inclusion_percent' => 'decimal:3',
        'quantity_kg'       => 'decimal:3',
        'cost'              => 'decimal:3',
    ];

    public function formula(): BelongsTo    { return $this->belongsTo(MealFormula::class, 'meal_formula_id'); }
    public function ingredient(): BelongsTo { return $this->belongsTo(MealIngredient::class, 'meal_ingredient_id'); }
}
