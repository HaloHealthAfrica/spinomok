<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $farm = app()->bound('current.farm') ? app('current.farm') : null;
        $role = app()->bound('current.farm.role') ? app('current.farm.role') : null;

        return [
            ...parent::share($request),
            'auth' => $user ? [
                'user'        => $user->only(['id', 'name', 'email', 'phone', 'is_active', 'created_at']),
                'farm'        => $farm?->only(['id', 'name', 'county', 'owner_name', 'phone', 'settings', 'subscription_plan']),
                'role'        => $role,
                'permissions' => $this->getUserPermissions($role),
            ] : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
            'sync' => $farm ? [
                'pending_count'  => 0, // Will be populated from sync queue table
                'last_synced_at' => null,
                'has_conflicts'  => false,
            ] : null,
        ];
    }

    private function getUserPermissions(?string $role): array
    {
        return match ($role) {
            'farm_owner'   => ['*'],
            'farm_manager' => [
                'animals.view', 'animals.create', 'animals.edit',
                'milk.view', 'milk.create', 'milk.edit',
                'breeding.view', 'breeding.create', 'breeding.edit',
                'health.view', 'health.create', 'health.edit',
                'feed.view', 'feed.create', 'feed.edit',
                'finance.view', 'finance.create',
                'reports.view', 'reports.export',
                'staff.view', 'staff.create',
                'tasks.view', 'tasks.create',
                'alerts.view', 'alerts.dismiss', 'alerts.resolve',
            ],
            'farm_worker'  => [
                'animals.view',
                'milk.view', 'milk.create',
                'health.view',
                'feed.view', 'feed.create',
                'tasks.view', 'tasks.complete',
                'alerts.view', 'alerts.dismiss',
            ],
            'veterinarian' => [
                'animals.view',
                'health.view', 'health.create', 'health.edit',
                'breeding.view', 'breeding.create',
                'alerts.view',
            ],
            default => [],
        };
    }
}
