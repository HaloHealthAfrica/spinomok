<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class DailyReport extends Model
{
    use HasUuids;
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'farm_id', 'report_date', 'status',
        'total_milk_litres', 'morning_litres', 'midday_litres', 'evening_litres', 'cows_milked',
        'milk_sold_litres', 'milk_revenue',
        'health_events_count', 'breeding_events_count', 'total_feed_cost',
        'weather', 'weather_notes', 'manager_notes', 'general_notes',
        'draft_data', 'draft_step',
        'submitted_by', 'submitted_at',
        'whatsapp_sent', 'whatsapp_sent_at',
        'pdf_path', 'pdf_generated_at',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'report_date'        => 'date',
        'draft_data'         => 'array',
        'submitted_at'       => 'datetime',
        'whatsapp_sent_at'   => 'datetime',
        'pdf_generated_at'   => 'datetime',
        'whatsapp_sent'      => 'boolean',
        'total_milk_litres'  => 'decimal:3',
        'morning_litres'     => 'decimal:3',
        'midday_litres'      => 'decimal:3',
        'evening_litres'     => 'decimal:3',
        'milk_sold_litres'   => 'decimal:3',
        'milk_revenue'       => 'decimal:2',
        'total_feed_cost'    => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function scopeSubmitted(Builder $query): Builder
    {
        return $query->where('status', 'submitted');
    }

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', 'draft');
    }

    public function getIsSubmittedAttribute(): bool
    {
        return $this->status === 'submitted';
    }
}
