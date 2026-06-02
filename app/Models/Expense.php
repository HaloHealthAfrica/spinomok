<?php

namespace App\Models;

use App\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Expense extends Model
{
    use HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'farm_id', 'expense_category_id', 'category', 'expense_date',
        'description', 'amount', 'currency', 'is_recurring', 'recurrence_interval',
        'supplier', 'receipt_number', 'payment_method', 'is_paid', 'paid_at',
        'reference_animal_id', 'notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'expense_date'  => 'date',
        'paid_at'       => 'datetime',
        'amount'        => 'decimal:2',
        'is_recurring'  => 'boolean',
        'is_paid'       => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FarmScope);
    }

    public function farm(): BelongsTo             { return $this->belongsTo(Farm::class); }
    public function expenseCategory(): BelongsTo  { return $this->belongsTo(ExpenseCategory::class, 'expense_category_id'); }
    public function referenceAnimal(): BelongsTo  { return $this->belongsTo(Animal::class, 'reference_animal_id'); }

    public function scopeForMonth(Builder $q, int $year, int $month): Builder
    {
        return $q->whereYear('expense_date', $year)->whereMonth('expense_date', $month);
    }

    public function scopeByCategory(Builder $q, string $cat): Builder
    {
        return $q->where('category', $cat);
    }
}
