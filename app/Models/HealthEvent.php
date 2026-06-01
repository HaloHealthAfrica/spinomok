<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class HealthEvent extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'disease_type_id', 'observed_on',
        'reported_by', 'symptoms', 'severity', 'is_recovered',
        'recovery_date', 'outcome', 'vet_consulted', 'vet_name',
        'consultation_cost', 'notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'observed_on'       => 'date',
        'recovery_date'     => 'date',
        'is_recovered'      => 'boolean',
        'vet_consulted'     => 'boolean',
        'consultation_cost' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo        { return $this->belongsTo(Farm::class); }
    public function animal(): BelongsTo      { return $this->belongsTo(Animal::class); }
    public function diseaseType(): BelongsTo { return $this->belongsTo(DiseaseType::class, 'disease_type_id'); }
    public function treatments(): HasMany    { return $this->hasMany(Treatment::class, 'health_event_id'); }
    public function reportedBy(): BelongsTo  { return $this->belongsTo(User::class, 'reported_by'); }

    public function scopeOpen(Builder $q): Builder       { return $q->where('is_recovered', false); }
    public function scopeRecovered(Builder $q): Builder  { return $q->where('is_recovered', true); }
    public function scopeRecent(Builder $q): Builder     { return $q->where('observed_on', '>=', now()->subDays(30)->toDateString()); }

    /** Total treatment cost for this event. */
    public function getTreatmentCostAttribute(): float
    {
        return (float) $this->treatments->sum('cost');
    }

    /** Total cost = consultation + treatments. */
    public function getTotalCostAttribute(): float
    {
        return (float) ($this->consultation_cost ?? 0) + $this->treatment_cost;
    }
}
