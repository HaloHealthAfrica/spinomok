<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Animal extends Model
{
    use HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'tag_number', 'name', 'sex', 'status', 'breed',
        'birth_date', 'date_acquired', 'acquisition_cost', 'acquisition_source',
        'sire_id', 'dam_id', 'is_pregnant', 'expected_calving_date',
        'last_calving_date', 'parity', 'weight_kg', 'photo_url', 'notes',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'birth_date'            => 'date',
        'date_acquired'         => 'date',
        'expected_calving_date' => 'date',
        'last_calving_date'     => 'date',
        'acquisition_cost'      => 'decimal:2',
        'weight_kg'             => 'decimal:2',
        'parity'                => 'integer',
        'is_pregnant'           => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function dam(): BelongsTo
    {
        return $this->belongsTo(Animal::class, 'dam_id');
    }

    public function sire(): BelongsTo
    {
        return $this->belongsTo(Animal::class, 'sire_id');
    }

    public function calves(): HasMany
    {
        return $this->hasMany(Animal::class, 'dam_id');
    }

    public function milkProduction(): HasMany
    {
        return $this->hasMany(MilkProduction::class);
    }

    public function weightRecords(): HasMany
    {
        return $this->hasMany(AnimalWeightRecord::class)->orderBy('measured_on');
    }

    public function calfFeedings(): HasMany
    {
        return $this->hasMany(CalfFeedingRecord::class)->orderBy('fed_on');
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeByFarm(Builder $query, string $farmId): Builder
    {
        return $query->where('farm_id', $farmId);
    }

    public function scopeLactating(Builder $query): Builder
    {
        return $query->where('status', 'lactating');
    }

    public function scopeDry(Builder $query): Builder
    {
        return $query->where('status', 'dry');
    }

    public function scopePregnant(Builder $query): Builder
    {
        return $query->where('is_pregnant', true);
    }

    public function scopeCalves(Builder $query): Builder
    {
        return $query->where('status', 'calf');
    }

    public function scopeHeifers(Builder $query): Builder
    {
        return $query->where('status', 'heifer');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('status', ['culled', 'sold', 'dead']);
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where(function (Builder $q) use ($term) {
            $q->where('tag_number', 'ilike', "%{$term}%")
              ->orWhere('name', 'ilike', "%{$term}%");
        });
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    public function getDaysInMilkAttribute(): ?int
    {
        if (!$this->last_calving_date) {
            return null;
        }
        if (!in_array($this->status, ['lactating', 'dry'])) {
            return null;
        }
        return (int) now()->diffInDays($this->last_calving_date);
    }

    public function getAgeInMonthsAttribute(): ?int
    {
        if (!$this->birth_date) {
            return null;
        }
        return (int) now()->diffInMonths($this->birth_date);
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->name ?? $this->tag_number;
    }
}
