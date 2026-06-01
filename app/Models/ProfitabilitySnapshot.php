<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfitabilitySnapshot extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'period_year', 'period_month',
        'total_milk_litres', 'total_milk_revenue', 'total_other_revenue', 'total_revenue',
        'total_feed_cost', 'total_vet_cost', 'total_labour_cost', 'total_other_expenses',
        'total_expenses', 'gross_margin', 'net_profit', 'cost_per_litre', 'revenue_per_litre',
        'computed_at',
    ];

    protected $casts = [
        'computed_at'          => 'datetime',
        'total_milk_litres'    => 'decimal:3',
        'total_milk_revenue'   => 'decimal:2',
        'total_other_revenue'  => 'decimal:2',
        'total_revenue'        => 'decimal:2',
        'total_feed_cost'      => 'decimal:2',
        'total_vet_cost'       => 'decimal:2',
        'total_labour_cost'    => 'decimal:2',
        'total_other_expenses' => 'decimal:2',
        'total_expenses'       => 'decimal:2',
        'gross_margin'         => 'decimal:2',
        'net_profit'           => 'decimal:2',
        'cost_per_litre'       => 'decimal:4',
        'revenue_per_litre'    => 'decimal:4',
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
