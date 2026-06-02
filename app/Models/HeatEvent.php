<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class HeatEvent extends Model
{
    use HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'observed_on', 'observed_at',
        'detection_method', 'confidence', 'signs_observed',
        'ai_window_start', 'ai_window_end', 'acted_on',
        'observed_by', 'notes', 'created_by',
    ];

    protected $casts = [
        'observed_on'     => 'date',
        'ai_window_start' => 'datetime',
        'ai_window_end'   => 'datetime',
        'signs_observed'  => 'array',
        'acted_on'        => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo    { return $this->belongsTo(Farm::class); }
    public function animal(): BelongsTo  { return $this->belongsTo(Animal::class); }
    public function aiService(): HasOne  { return $this->hasOne(AIService::class, 'heat_event_id'); }

    public function scopeActedOn(Builder $q): Builder   { return $q->where('acted_on', true); }
    public function scopePending(Builder $q): Builder    { return $q->where('acted_on', false); }
    public function scopeRecent(Builder $q): Builder     { return $q->where('observed_on', '>=', now()->subDays(21)); }
}
