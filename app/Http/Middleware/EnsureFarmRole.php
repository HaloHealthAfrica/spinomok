<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFarmRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $role = app()->bound('current.farm.role') ? app('current.farm.role') : null;

        abort_unless($role && in_array($role, $roles, true), 403);

        return $next($request);
    }
}
