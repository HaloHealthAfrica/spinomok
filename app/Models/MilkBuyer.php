<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class MilkBuyer extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'name', 'buyer_type', 'contact_name', 'phone', 'email',
        'default_price_per_litre', 'payment_terms_days', 'is_active', 'notes',
    ];

    protected $casts = [
        'default_price_per_litre' => 'decimal:2',
        'is_active'               => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function milkSales(): HasMany
    {
        return $this->hasMany(MilkSale::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
