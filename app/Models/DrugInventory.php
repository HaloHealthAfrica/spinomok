<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class DrugInventory extends Model
{
    use HasUuids;
    protected $table = 'drug_inventory';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'medication_type_id', 'product_name', 'quantity_on_hand',
        'unit_of_measure', 'reorder_level', 'cost_per_unit',
        'supplier', 'batch_number', 'expiry_date', 'last_restocked_on', 'notes',
    ];

    protected $casts = [
        'quantity_on_hand'   => 'float',
        'reorder_level'      => 'float',
        'cost_per_unit'      => 'float',
        'expiry_date'        => 'date',
        'last_restocked_on'  => 'date',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo       { return $this->belongsTo(Farm::class); }
    public function medication(): BelongsTo { return $this->belongsTo(MedicationType::class, 'medication_type_id'); }

    public function scopeLowStock(Builder $q): Builder
    {
        return $q->whereNotNull('reorder_level')
                 ->whereRaw('quantity_on_hand <= reorder_level');
    }

    public function scopeExpiringSoon(Builder $q, int $days = 30): Builder
    {
        return $q->whereNotNull('expiry_date')
                 ->where('expiry_date', '<=', now()->addDays($days)->toDateString());
    }
}
