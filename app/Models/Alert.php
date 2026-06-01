<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Alert extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'alert_type', 'severity', 'status', 'title', 'message',
        'reference_table', 'reference_id', 'animal_id', 'due_on',
        'acknowledged_by', 'acknowledged_at', 'resolved_by', 'resolved_at',
        'auto_resolved',
    ];

    protected $casts = [
        'due_on'          => 'date',
        'acknowledged_at' => 'datetime',
        'resolved_at'     => 'datetime',
        'auto_resolved'   => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeCritical(Builder $query): Builder
    {
        return $query->where('severity', 'critical');
    }

    public function scopeDueBy(Builder $query, string $date): Builder
    {
        return $query->where('due_on', '<=', $date);
    }
}
