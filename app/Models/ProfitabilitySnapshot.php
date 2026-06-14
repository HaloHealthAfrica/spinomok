<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfitabilitySnapshot extends Model
{
    use HasUuids;
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'farm_id', 'period_year', 'period_month',
        'total_milk_litres', 'total_milk_revenue', 'total_other_revenue', 'total_revenue',
        'total_feed_cost', 'total_vet_cost', 'total_labour_cost', 'total_other_expenses',
        'total_expenses', 'gross_margin', 'net_profit', 'cost_per_litre', 'revenue_per_litre',
        'computed_at',
    ];

    protected $casts = [
        'computed_at'          => 'datetime',
        'total_milk_litres'    => 'float',
        'total_milk_revenue'   => 'float',
        'total_other_revenue'  => 'float',
        'total_revenue'        => 'float',
        'total_feed_cost'      => 'float',
        'total_vet_cost'       => 'float',
        'total_labour_cost'    => 'float',
        'total_other_expenses' => 'float',
        'total_expenses'       => 'float',
        'gross_margin'         => 'float',
        'net_profit'           => 'float',
        'cost_per_litre'       => 'float',
        'revenue_per_litre'    => 'float',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo { return $this->belongsTo(Farm::class); }

    public function getMonthLabelAttribute(): string
    {
        return \Carbon\Carbon::createFromDate($this->period_year, $this->period_month, 1)
            ->format('M Y');
    }

    public function getMarginPercentAttribute(): float
    {
        if (!$this->total_revenue || $this->total_revenue == 0) return 0;
        return round(($this->net_profit / $this->total_revenue) * 100, 1);
    }
}
