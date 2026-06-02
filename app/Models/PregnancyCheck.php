<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PregnancyCheck extends Model
{
    use HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'ai_service_id', 'checked_on',
        'days_post_service', 'method', 'result', 'foetus_age_days',
        'expected_calving_date', 'checked_by', 'vet_id', 'cost', 'notes', 'created_by',
    ];

    protected $casts = [
        'checked_on'            => 'date',
        'expected_calving_date' => 'date',
        'cost'                  => 'decimal:2',
        'days_post_service'     => 'integer',
        'foetus_age_days'       => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo      { return $this->belongsTo(Farm::class); }
    public function animal(): BelongsTo    { return $this->belongsTo(Animal::class); }
    public function aiService(): BelongsTo { return $this->belongsTo(AIService::class, 'ai_service_id'); }
}
