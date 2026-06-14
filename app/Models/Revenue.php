<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Revenue extends Model
{
    use HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'category', 'revenue_date', 'description', 'amount', 'currency',
        'buyer_name', 'reference_animal_id', 'receipt_number', 'payment_method',
        'is_received', 'received_at', 'notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'revenue_date' => 'date',
        'received_at'  => 'datetime',
        'amount'       => 'float',
        'is_received'  => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo           { return $this->belongsTo(Farm::class); }
    public function referenceAnimal(): BelongsTo { return $this->belongsTo(Animal::class, 'reference_animal_id'); }

    public function scopeForMonth(Builder $q, int $year, int $month): Builder
    {
        return $q->whereYear('revenue_date', $year)->whereMonth('revenue_date', $month);
    }

    public function scopeByCategory(Builder $q, string $cat): Builder
    {
        return $q->where('category', $cat);
    }
}
