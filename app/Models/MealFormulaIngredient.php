<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealFormulaIngredient extends Model
{
    use HasUuids;
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'meal_formula_id', 'meal_ingredient_id', 'inclusion_percent', 'quantity_kg', 'cost',
    ];

    protected $casts = [
        'inclusion_percent' => 'float',
        'quantity_kg'       => 'float',
        'cost'              => 'float',
    ];

    public function formula(): BelongsTo    { return $this->belongsTo(MealFormula::class, 'meal_formula_id'); }
    public function ingredient(): BelongsTo { return $this->belongsTo(MealIngredient::class, 'meal_ingredient_id'); }
}
