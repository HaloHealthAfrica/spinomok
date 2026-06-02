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
        return [
            ...parent::share($request),

            // IMPORTANT: auth must be a closure (lazy) so it evaluates AFTER
            // SetFarmContext route middleware has bound 'current.farm'.
            // If evaluated eagerly here, farm will always be null.
            'auth' => fn () => $request->user() ? [
                'user'        => $request->user()->only(['id', 'name', 'email', 'phone', 'is_active', 'created_at']),
                'farm'        => app()->bound('current.farm')
                                    ? app('current.farm')?->only([
                                        'id',
                                        'name',
                                        'county',
                                        'sub_county',
                                        'owner_name',
                                        'phone',
                                        'email',
                                        'settings',
                                        'subscription_plan',
                                    ])
                                    : null,
                'role'        => app()->bound('current.farm.role') ? app('current.farm.role') : null,
                'permissions' => $this->getUserPermissions(
                    app()->bound('current.farm.role') ? app('current.farm.role') : null
                ),
            ] : null,

            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],

            'sync' => fn () => app()->bound('current.farm') ? [
                'pending_count'  => 0,
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
