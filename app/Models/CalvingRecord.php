<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CalvingRecord extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'dam_id', 'calf_id', 'breeding_record_id',
        'calved_on', 'calved_at', 'ease', 'calf_outcome',
        'calf_sex', 'calf_tag', 'calf_birth_weight_kg',
        'is_twin', 'twin_calf_id', 'placenta_passed', 'placenta_passed_hours',
        'colostrum_given', 'colostrum_given_at',
        'complications', 'notes', 'assisted_by', 'created_by',
    ];

    protected $casts = [
        'calved_on'          => 'date',
        'colostrum_given_at' => 'datetime',
        'calf_birth_weight_kg' => 'decimal:2',
        'is_twin'            => 'boolean',
        'placenta_passed'    => 'boolean',
        'colostrum_given'    => 'boolean',
        'placenta_passed_hours' => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo      { return $this->belongsTo(Farm::class); }
    public function dam(): BelongsTo       { return $this->belongsTo(Animal::class, 'dam_id'); }
    public function calf(): BelongsTo      { return $this->belongsTo(Animal::class, 'calf_id'); }
    public function aiService(): BelongsTo { return $this->belongsTo(AIService::class, 'breeding_record_id'); }
}
