<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MedicationType extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name', 'active_ingredient', 'category', 'unit_of_measure',
        'withdrawal_period_days', 'meat_withdrawal_days',
        'requires_prescription', 'is_active',
    ];

    protected $casts = [
        'requires_prescription'  => 'boolean',
        'is_active'              => 'boolean',
        'withdrawal_period_days' => 'integer',
        'meat_withdrawal_days'   => 'integer',
    ];

    public function treatments(): HasMany
    {
        return $this->hasMany(Treatment::class);
    }

    public function drugInventory(): HasMany
    {
        return $this->hasMany(DrugInventory::class);
    }
}
