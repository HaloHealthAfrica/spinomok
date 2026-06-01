<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RationPlanComponent extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'ration_plan_id', 'feed_type_id', 'meal_formula_id',
        'component_name', 'quantity_kg_per_head', 'dm_kg_per_head',
        'cp_contribution_percent', 'me_contribution', 'cost_per_head',
    ];

    protected $casts = [
        'quantity_kg_per_head'   => 'decimal:3',
        'dm_kg_per_head'         => 'decimal:3',
        'cp_contribution_percent'=> 'decimal:2',
        'me_contribution'        => 'decimal:3',
        'cost_per_head'          => 'decimal:2',
    ];

    public function rationPlan(): BelongsTo  { return $this->belongsTo(RationPlan::class, 'ration_plan_id'); }
    public function feedType(): BelongsTo    { return $this->belongsTo(FeedType::class, 'feed_type_id'); }
    public function mealFormula(): BelongsTo { return $this->belongsTo(MealFormula::class, 'meal_formula_id'); }
}
