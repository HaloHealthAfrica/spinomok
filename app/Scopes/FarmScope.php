<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Global scope that automatically filters all farm-scoped models
 * by the currently active farm (set via SetFarmContext middleware).
 *
 * This is Layer 2 of multi-tenancy enforcement.
 * Layer 1: SetFarmContext middleware
 * Layer 2: This scope (auto WHERE farm_id = ?)
 * Layer 3: Policy-level check per action
 */
class FarmScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (app()->bound('current.farm.id')) {
            $farmId = app('current.farm.id');
            $builder->where($model->getTable() . '.farm_id', $farmId);
        }
    }
}
