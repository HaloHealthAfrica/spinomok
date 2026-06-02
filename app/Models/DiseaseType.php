<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiseaseType extends Model
{
    use HasUuids;
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name', 'category', 'common_signs', 'is_notifiable', 'is_active',
    ];

    protected $casts = [
        'is_notifiable' => 'boolean',
        'is_active'     => 'boolean',
    ];

    public function healthEvents(): HasMany
    {
        return $this->hasMany(HealthEvent::class);
    }
}
