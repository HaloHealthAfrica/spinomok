<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeedType extends Model
{
    use HasUuids;
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name', 'category', 'dry_matter_percent', 'crude_protein_percent',
        'metabolizable_energy', 'neutral_detergent_fibre',
        'default_unit', 'description', 'is_active',
    ];

    protected $casts = [
        'dry_matter_percent'    => 'float',
        'crude_protein_percent' => 'float',
        'metabolizable_energy'  => 'float',
        'neutral_detergent_fibre' => 'float',
        'is_active'             => 'boolean',
    ];

    public function feedInventory(): HasMany
    {
        return $this->hasMany(FeedInventory::class, 'feed_type_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(FeedInventoryTransaction::class, 'feed_type_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}
