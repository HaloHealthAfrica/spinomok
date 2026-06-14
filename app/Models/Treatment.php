<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Treatment extends Model
{
    use HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'health_event_id', 'animal_id', 'medication_type_id',
        'treated_on', 'dose_amount', 'dose_unit', 'route',
        'frequency', 'duration_days', 'withdrawal_end_date',
        'cost', 'administered_by', 'notes', 'created_by',
    ];

    protected $casts = [
        'treated_on'          => 'date',
        'withdrawal_end_date' => 'date',
        'dose_amount'         => 'float',
        'cost'                => 'float',
        'duration_days'       => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);

        // Auto-calculate withdrawal end date before saving
        static::saving(function (Treatment $t) {
            if ($t->treated_on && $t->medication_type_id) {
                $med = MedicationType::withoutGlobalScopes()->find($t->medication_type_id);
                if ($med && $med->withdrawal_period_days > 0) {
                    $t->withdrawal_end_date = Carbon::parse($t->treated_on)->addDays($med->withdrawal_period_days);
                }
            }
        });
    }

    public function farm(): BelongsTo           { return $this->belongsTo(Farm::class); }
    public function healthEvent(): BelongsTo    { return $this->belongsTo(HealthEvent::class, 'health_event_id'); }
    public function animal(): BelongsTo         { return $this->belongsTo(Animal::class); }
    public function medication(): BelongsTo     { return $this->belongsTo(MedicationType::class, 'medication_type_id'); }

    public function getIsInWithdrawalAttribute(): bool
    {
        return $this->withdrawal_end_date && $this->withdrawal_end_date->isFuture();
    }
}
