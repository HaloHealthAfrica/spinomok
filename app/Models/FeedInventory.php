<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class FeedInventory extends Model
{
    use HasUuids;
    protected $table = 'feed_inventory';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'feed_type_id', 'quantity_kg', 'reorder_level_kg',
        'storage_location', 'avg_cost_per_kg', 'last_restocked_on', 'notes',
    ];

    protected $casts = [
        'quantity_kg'       => 'float',
        'reorder_level_kg'  => 'float',
        'avg_cost_per_kg'   => 'float',
        'last_restocked_on' => 'date',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo     { return $this->belongsTo(Farm::class); }
    public function feedType(): BelongsTo { return $this->belongsTo(FeedType::class, 'feed_type_id'); }

    public function transactions(): HasMany
    {
        return $this->hasMany(FeedInventoryTransaction::class, 'feed_inventory_id')->orderByDesc('transaction_date');
    }

    /** Estimated days of supply remaining based on last 7-day consumption. */
    public function getDaysRemainingAttribute(): ?float
    {
        $recentConsumption = $this->transactions()
            ->where('transaction_type', 'consumption')
            ->where('transaction_date', '>=', now()->subDays(7)->toDateString())
            ->sum('quantity_kg'); // negative values

        $dailyAvg = $recentConsumption > 0 ? abs($recentConsumption) / 7 : null;

        if (!$dailyAvg || $dailyAvg === 0.0) return null;

        return round((float) $this->quantity_kg / $dailyAvg, 1);
    }

    public function scopeLowStock(Builder $q): Builder
    {
        return $q->whereNotNull('reorder_level_kg')
                 ->whereRaw('quantity_kg <= reorder_level_kg');
    }

    public function scopeZeroStock(Builder $q): Builder
    {
        return $q->where('quantity_kg', '<=', 0);
    }

    /** Is current stock below the reorder threshold? */
    public function getIsLowAttribute(): bool
    {
        return $this->reorder_level_kg !== null && (float) $this->quantity_kg <= (float) $this->reorder_level_kg;
    }
}
