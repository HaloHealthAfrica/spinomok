<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class MilkSale extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'milk_buyer_id', 'sale_date', 'session',
        'quantity_litres', 'price_per_litre', 'total_amount',
        'is_paid', 'paid_at', 'payment_method', 'receipt_number',
        'notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'sale_date'        => 'date',
        'paid_at'          => 'datetime',
        'quantity_litres'  => 'decimal:3',
        'price_per_litre'  => 'decimal:2',
        'total_amount'     => 'decimal:2',
        'is_paid'          => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);

        // Auto-compute total_amount before saving
        static::saving(function (self $sale) {
            $sale->total_amount = round($sale->quantity_litres * $sale->price_per_litre, 2);
        });
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(MilkBuyer::class, 'milk_buyer_id');
    }

    public function scopeForDate(Builder $query, string $date): Builder
    {
        return $query->whereDate('sale_date', $date);
    }

    public function scopeForMonth(Builder $query, int $year, int $month): Builder
    {
        return $query->whereYear('sale_date', $year)->whereMonth('sale_date', $month);
    }
}
