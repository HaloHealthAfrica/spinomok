<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VaccineType extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name', 'disease_prevented', 'manufacturer',
        'recommended_age_weeks', 'booster_interval_days',
        'withdrawal_period_days', 'is_active',
    ];

    protected $casts = [
        'is_active'              => 'boolean',
        'recommended_age_weeks'  => 'integer',
        'booster_interval_days'  => 'integer',
        'withdrawal_period_days' => 'integer',
    ];

    public function vaccinations(): HasMany
    {
        return $this->hasMany(Vaccination::class, 'vaccine_type_id');
    }
}
