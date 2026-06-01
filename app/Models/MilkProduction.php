<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class MilkProduction extends Model
{
    use SoftDeletes;

    protected $table = 'milk_production';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'animal_id', 'milked_on', 'session',
        'quantity_litres', 'fat_percentage', 'protein_percentage',
        'somatic_cell_count', 'milked_by', 'notes',
        'is_colostrum', 'is_withheld', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'milked_on'        => 'date',
        'quantity_litres'  => 'decimal:3',
        'fat_percentage'   => 'decimal:2',
        'protein_percentage' => 'decimal:2',
        'is_colostrum'     => 'boolean',
        'is_withheld'      => 'boolean',
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

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'milked_by');
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeForDate(Builder $query, string $date): Builder
    {
        return $query->whereDate('milked_on', $date);
    }

    public function scopeForMonth(Builder $query, int $year, int $month): Builder
    {
        return $query->whereYear('milked_on', $year)->whereMonth('milked_on', $month);
    }

    public function scopeByAnimal(Builder $query, string $animalId): Builder
    {
        return $query->where('animal_id', $animalId);
    }

    public function scopeSaleable(Builder $query): Builder
    {
        return $query->where('is_colostrum', false)->where('is_withheld', false);
    }
}
