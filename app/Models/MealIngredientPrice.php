<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealIngredientPrice extends Model
{
    use HasUuids;
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'meal_ingredient_id', 'price_per_kg', 'effective_from', 'supplier', 'created_by',
    ];

    protected $casts = [
        'price_per_kg'   => 'decimal:2',
        'effective_from' => 'date',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo       { return $this->belongsTo(Farm::class); }
    public function ingredient(): BelongsTo { return $this->belongsTo(MealIngredient::class, 'meal_ingredient_id'); }
}
