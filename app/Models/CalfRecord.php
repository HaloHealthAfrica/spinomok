<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CalfRecord extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'dob', 'birth_weight_kg',
        'dam_animal_id', 'sex', 'housing_notes',
    ];

    protected $casts = [
        'dob'              => 'date',
        'birth_weight_kg'  => 'float',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    // ─── Relationships ─────────────────────────────────────────────────────────

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function feedLogs(): HasMany
    {
        return $this->hasMany(CalfFeedLog::class)->orderByDesc('log_date');
    }

    public function weightLogs(): HasMany
    {
        return $this->hasMany(CalfWeightLog::class)->orderBy('weighed_date');
    }

    public function vaccinations(): HasMany
    {
        return $this->hasMany(CalfVaccination::class)->orderBy('due_date');
    }

    public function healthEvents(): HasMany
    {
        return $this->hasMany(CalfHealthEvent::class)->orderByDesc('event_date');
    }

    public function practices(): HasMany
    {
        return $this->hasMany(CalfPractice::class);
    }

    // ─── Computed Attributes ───────────────────────────────────────────────────

    public function getPhaseAttribute(): string
    {
        $days = $this->age_in_days;
        if ($days <= 3)   return 'colostrum';
        if ($days <= 28)  return 'early_milk';
        if ($days <= 63)  return 'pre_weaning';
        if ($days <= 180) return 'post_weaning';
        return 'growing';
    }

    public function getAgeInDaysAttribute(): int
    {
        return (int) Carbon::parse($this->dob)->diffInDays(now());
    }

    public function getAgeInMonthsAttribute(): int
    {
        return (int) Carbon::parse($this->dob)->diffInMonths(now());
    }

    public function getAverageDailyGainAttribute(): ?float
    {
        $logs = $this->weightLogs()->get();
        if ($logs->count() < 2) return null;

        $first = $logs->first();
        $last  = $logs->last();
        $days  = max(1, Carbon::parse($first->weighed_date)->diffInDays($last->weighed_date));

        return round((($last->weight_kg - $first->weight_kg) / $days) * 1000, 0); // grams
    }

    public function getRecommendedLegendsGramsAttribute(): int
    {
        $month = $this->age_in_months + 1; // month 1 = first 30 days
        return match (true) {
            $month <= 1 => 50,
            $month <= 2 => 60,
            $month <= 3 => 60,
            $month <= 4 => 70,
            $month <= 5 => 90,
            default     => 0,  // 6mo+ → switch to Maclik Plus
        };
    }

    public function getRecommendedMilkLitresAttribute(): string
    {
        return match ($this->phase) {
            'colostrum'    => '2–4L colostrum (10–12% BW)',
            'early_milk'   => '5–6L whole milk',
            'pre_weaning'  => '3–4L reducing to 0L',
            'post_weaning' => 'Weaned (0L milk)',
            default        => 'Weaned (0L milk)',
        };
    }

    public function getRecommendedStarterKgAttribute(): string
    {
        $days = $this->age_in_days;
        return match (true) {
            $days <= 3   => '—',
            $days <= 7   => '0.25 kg',
            $days <= 14  => '0.5 kg',
            $days <= 21  => '0.75 kg',
            $days <= 28  => '1.0 kg',
            $days <= 49  => '1.5 kg',
            $days <= 63  => '2.0 kg',
            $days <= 180 => '1.5 kg mixed feed',
            default      => 'Pasture + minerals',
        };
    }

    public function getIsActiveCalfAttribute(): bool
    {
        return $this->age_in_months <= 12;
    }
}
