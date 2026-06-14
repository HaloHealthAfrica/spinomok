<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Vaccination extends Model
{
    use HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'vaccine_type_id', 'vaccinated_on',
        'batch_number', 'dose_ml', 'route', 'site',
        'next_due_date', 'administered_by', 'cost',
        'adverse_reaction', 'reaction_notes', 'notes', 'created_by',
    ];

    protected $casts = [
        'vaccinated_on'   => 'date',
        'next_due_date'   => 'date',
        'dose_ml'         => 'float',
        'cost'            => 'float',
        'adverse_reaction'=> 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);

        // Auto-set next_due_date from vaccine interval
        static::saving(function (Vaccination $v) {
            if ($v->vaccine_type_id && $v->vaccinated_on && !$v->next_due_date) {
                $type = VaccineType::withoutGlobalScopes()->find($v->vaccine_type_id);
                if ($type && $type->booster_interval_days) {
                    $v->next_due_date = \Carbon\Carbon::parse($v->vaccinated_on)->addDays($type->booster_interval_days);
                }
            }
        });

        // After saving, create/update the vaccination-due alert
        static::saved(function (Vaccination $v) {
            if ($v->next_due_date) {
                // Resolve existing alert
                \App\Models\Alert::withoutGlobalScopes()
                    ->where('farm_id', $v->farm_id)
                    ->where('animal_id', $v->animal_id)
                    ->where('alert_type', 'vaccination_due')
                    ->where('status', 'pending')
                    ->whereJsonContains('reference_id', $v->id)
                    ->update(['status' => 'resolved', 'auto_resolved' => true]);

                // Schedule new alert 7 days before next due
                $alertDate = \Carbon\Carbon::parse($v->next_due_date)->subDays(7);
                $vaccineName = VaccineType::withoutGlobalScopes()->find($v->vaccine_type_id)?->name ?? 'Vaccination';
                $animal = Animal::withoutGlobalScopes()->find($v->animal_id);

                \App\Models\Alert::create([
                    'id'              => \Illuminate\Support\Str::uuid(),
                    'farm_id'         => $v->farm_id,
                    'alert_type'      => 'vaccination_due',
                    'severity'        => 'warning',
                    'status'          => 'pending',
                    'title'           => "{$vaccineName} Due — " . ($animal?->display_name ?? ''),
                    'message'         => "Next dose due on {$v->next_due_date->format('d M Y')}.",
                    'animal_id'       => $v->animal_id,
                    'due_on'          => $alertDate->toDateString(),
                    'reference_table' => 'vaccinations',
                    'reference_id'    => $v->id,
                ]);
            }
        });
    }

    public function farm(): BelongsTo        { return $this->belongsTo(Farm::class); }
    public function animal(): BelongsTo      { return $this->belongsTo(Animal::class); }
    public function vaccineType(): BelongsTo { return $this->belongsTo(VaccineType::class, 'vaccine_type_id'); }

    public function scopeDueSoon(Builder $q, int $days = 14): Builder
    {
        return $q->where('next_due_date', '<=', now()->addDays($days)->toDateString())
                 ->where('next_due_date', '>=', now()->toDateString());
    }

    public function scopeOverdue(Builder $q): Builder
    {
        return $q->where('next_due_date', '<', now()->toDateString());
    }
}
