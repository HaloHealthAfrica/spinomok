<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncProgramEvent extends Model
{
    use HasUuids;
    protected $table = 'sync_program_events';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'sync_program_id', 'farm_id', 'event_type', 'custom_label',
        'scheduled_on', 'completed_on', 'drug_name', 'dose_ml',
        'route', 'administered_by', 'is_completed', 'notes',
    ];

    protected $casts = [
        'scheduled_on' => 'date',
        'completed_on' => 'date',
        'is_completed' => 'boolean',
        'dose_ml'      => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function program(): BelongsTo { return $this->belongsTo(SyncProgram::class, 'sync_program_id'); }
    public function farm(): BelongsTo    { return $this->belongsTo(Farm::class); }
}
