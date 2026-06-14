<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class SemenInventory extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'semen_inventory';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'bull_name', 'bull_breed', 'semen_type', 'inseminator',
        'batch_number', 'supplier', 'straws_received', 'straws_remaining',
        'cost_per_straw', 'received_on', 'expiry_date', 'notes', 'created_by',
    ];

    protected $casts = [
        'received_on'   => 'date',
        'expiry_date'   => 'date',
        'cost_per_straw'=> 'float',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo    { return $this->belongsTo(Farm::class); }
    public function aiServices(): HasMany { return $this->hasMany(AIService::class); }

    public function scopeAvailable(Builder $q): Builder { return $q->where('straws_remaining', '>', 0); }
    public function scopeLowStock(Builder $q): Builder  { return $q->where('straws_remaining', '<=', 5); }

    public function decrementStraw(): void
    {
        if ($this->straws_remaining > 0) {
            $this->decrement('straws_remaining');
        }
    }
}
