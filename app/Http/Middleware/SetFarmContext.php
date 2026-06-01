<?php

namespace App\Http\Middleware;

use App\Models\FarmUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active farm for the authenticated user and binds it to the
 * application container so FarmScope can filter all queries automatically.
 *
 * Supports multi-farm owners via X-Farm-ID header.
 */
class SetFarmContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        // Allow multi-farm owners to switch context via header
        $requestedFarmId = $request->header('X-Farm-ID');

        $farmUser = FarmUser::where('user_id', $user->id)
            ->where('is_active', true)
            ->when($requestedFarmId, fn($q) => $q->where('farm_id', $requestedFarmId))
            ->with('farm')
            ->first();

        if (!$farmUser) {
            return response()->json(['message' => 'Farm context not found.'], 403);
        }

        // Bind farm and role to the app container
        app()->instance('current.farm', $farmUser->farm);
        app()->instance('current.farm.id', $farmUser->farm_id);
        app()->instance('current.farm.role', $farmUser->role);

        // Add farm_id to request for convenience
        $request->merge(['__farm_id' => $farmUser->farm_id]);

        return $next($request);
    }
}
