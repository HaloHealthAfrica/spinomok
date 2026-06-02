<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SyncProgram extends Model
{
    use HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'program_type', 'custom_name',
        'start_date', 'status', 'ai_service_id', 'notes', 'created_by',
    ];

    protected $casts = ['start_date' => 'date'];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo    { return $this->belongsTo(Farm::class); }
    public function animal(): BelongsTo  { return $this->belongsTo(Animal::class); }
    public function aiService(): BelongsTo { return $this->belongsTo(AIService::class, 'ai_service_id'); }
    public function steps(): HasMany     { return $this->hasMany(SyncProgramEvent::class, 'sync_program_id')->orderBy('scheduled_on'); }
}
