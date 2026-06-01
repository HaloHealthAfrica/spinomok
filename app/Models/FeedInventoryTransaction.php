<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class FeedInventoryTransaction extends Model
{
    protected $table = 'feed_inventory_transactions';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'feed_inventory_id', 'feed_type_id',
        'transaction_type', 'transaction_date', 'quantity_kg',
        'unit_cost', 'total_cost', 'supplier', 'reference_number',
        'animal_group', 'recorded_by', 'notes', 'created_by',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'quantity_kg'      => 'decimal:3',
        'unit_cost'        => 'decimal:3',
        'total_cost'       => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);

        // Auto-compute total_cost before saving
        static::saving(function (FeedInventoryTransaction $t) {
            if ($t->unit_cost && $t->quantity_kg) {
                $t->total_cost = round(abs($t->quantity_kg) * $t->unit_cost, 2);
            }
        });

        // After save, update the inventory balance
        static::saved(function (FeedInventoryTransaction $t) {
            $inventory = FeedInventory::withoutGlobalScopes()->find($t->feed_inventory_id);
            if ($inventory) {
                // Recompute total from all transactions for accuracy
                $balance = FeedInventoryTransaction::withoutGlobalScopes()
                    ->where('feed_inventory_id', $t->feed_inventory_id)
                    ->sum('quantity_kg');

                $inventory->update(['quantity_kg' => max(0, $balance)]);
            }
        });
    }

    public function farm(): BelongsTo      { return $this->belongsTo(Farm::class); }
    public function inventory(): BelongsTo { return $this->belongsTo(FeedInventory::class, 'feed_inventory_id'); }
    public function feedType(): BelongsTo  { return $this->belongsTo(FeedType::class, 'feed_type_id'); }

    public function scopePurchases(Builder $q): Builder    { return $q->where('transaction_type', 'purchase'); }
    public function scopeConsumption(Builder $q): Builder  { return $q->where('transaction_type', 'consumption'); }
    public function scopeForDate(Builder $q, string $date): Builder { return $q->whereDate('transaction_date', $date); }
    public function scopeForMonth(Builder $q, int $year, int $month): Builder
    {
        return $q->whereYear('transaction_date', $year)->whereMonth('transaction_date', $month);
    }
}
