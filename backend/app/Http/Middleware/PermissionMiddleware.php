<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $parsedPermissions = [];
        foreach ($permissions as $permission) {
            foreach (explode(',', $permission) as $p) {
                $p = trim($p);
                if ($p !== '') {
                    $parsedPermissions[] = $p;
                }
            }
        }

        foreach ($parsedPermissions as $permission) {
            if ($user->hasPermission($permission)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'Forbidden. Missing required permission.'], 403);
    }
}
