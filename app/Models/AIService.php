<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class AIService extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'ai_services';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'heat_event_id', 'semen_inventory_id',
        'service_date', 'service_time', 'technician_name', 'technician_phone',
        'service_cost', 'result', 'conception_confirmed_on',
        'expected_calving_date', 'expected_dry_off_date',
        'service_number', 'notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'service_date'           => 'date',
        'conception_confirmed_on'=> 'date',
        'expected_calving_date'  => 'date',
        'expected_dry_off_date'  => 'date',
        'service_cost'           => 'decimal:2',
        'service_number'         => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo             { return $this->belongsTo(Farm::class); }
    public function animal(): BelongsTo           { return $this->belongsTo(Animal::class); }
    public function heatEvent(): BelongsTo        { return $this->belongsTo(HeatEvent::class, 'heat_event_id'); }
    public function semen(): BelongsTo            { return $this->belongsTo(SemenInventory::class, 'semen_inventory_id'); }
    public function pregnancyChecks(): HasMany    { return $this->hasMany(PregnancyCheck::class, 'ai_service_id'); }
    public function calvingRecord(): HasOne       { return $this->hasOne(CalvingRecord::class, 'breeding_record_id'); }

    public function scopePending(Builder $q): Builder    { return $q->where('result', 'pending'); }
    public function scopePregnant(Builder $q): Builder   { return $q->where('result', 'confirmed_pregnant'); }

    public function scopeDueForCalving(Builder $q, int $days = 14): Builder
    {
        return $q->where('result', 'confirmed_pregnant')
                 ->where('expected_calving_date', '<=', now()->addDays($days)->toDateString())
                 ->where('expected_calving_date', '>=', now()->toDateString());
    }

    public function scopeDueForPregnancyCheck(Builder $q): Builder
    {
        return $q->where('result', 'pending')
                 ->where('service_date', '<=', now()->subDays(28)->toDateString())
                 ->where('service_date', '>=', now()->subDays(90)->toDateString());
    }
}
