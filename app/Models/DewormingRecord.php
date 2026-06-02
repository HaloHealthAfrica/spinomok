<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class DewormingRecord extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'deworming_records';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'drug_name', 'active_ingredient',
        'dose_amount', 'dose_unit', 'route', 'dewormed_on',
        'next_due_date', 'withdrawal_end_date', 'cost',
        'administered_by', 'notes', 'created_by',
    ];

    protected $casts = [
        'dewormed_on'         => 'date',
        'next_due_date'       => 'date',
        'withdrawal_end_date' => 'date',
        'dose_amount'         => 'decimal:3',
        'cost'                => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);

        // Default next due date: 90 days after deworming
        static::saving(function (DewormingRecord $r) {
            if ($r->dewormed_on && !$r->next_due_date) {
                $r->next_due_date = \Carbon\Carbon::parse($r->dewormed_on)->addDays(90);
            }
        });

        // Create deworming-due alert after save
        static::saved(function (DewormingRecord $r) {
            if ($r->next_due_date) {
                $animal = Animal::withoutGlobalScopes()->find($r->animal_id);
                $alertDate = \Carbon\Carbon::parse($r->next_due_date)->subDays(7);

                \App\Models\Alert::create([
                    'id'              => \Illuminate\Support\Str::uuid(),
                    'farm_id'         => $r->farm_id,
                    'alert_type'      => 'deworming_due',
                    'severity'        => 'info',
                    'status'          => 'pending',
                    'title'           => "Deworming Due — " . ($animal?->display_name ?? ''),
                    'message'         => "Next deworming due on {$r->next_due_date->format('d M Y')} ({$r->drug_name}).",
                    'animal_id'       => $r->animal_id,
                    'due_on'          => $alertDate->toDateString(),
                    'reference_table' => 'deworming_records',
                    'reference_id'    => $r->id,
                ]);
            }
        });
    }

    public function farm(): BelongsTo   { return $this->belongsTo(Farm::class); }
    public function animal(): BelongsTo { return $this->belongsTo(Animal::class); }

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
