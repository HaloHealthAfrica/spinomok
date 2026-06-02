<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasUuids, HasFactory, Notifiable, SoftDeletes, HasApiTokens;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at'     => 'datetime',
            'password'          => 'hashed',
            'is_active'         => 'boolean',
        ];
    }

    public function farms(): BelongsToMany
    {
        return $this->belongsToMany(Farm::class, 'farm_users')
            ->withPivot('role', 'is_active', 'joined_at')
            ->withTimestamps();
    }

    public function farmUsers(): HasMany
    {
        return $this->hasMany(FarmUser::class);
    }

    public function roleOnFarm(string $farmId): ?string
    {
        return $this->farmUsers()
            ->where('farm_id', $farmId)
            ->where('is_active', true)
            ->value('role');
    }

    public function belongsToFarm(string $farmId): bool
    {
        return $this->farmUsers()
            ->where('farm_id', $farmId)
            ->where('is_active', true)
            ->exists();
    }
}
