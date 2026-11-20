<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Support both spread args and comma-separated strings (e.g. 'role:institution_admin,super_admin')
        $parsedRoles = [];
        foreach ($roles as $role) {
            foreach (explode(',', $role) as $r) {
                $r = trim($r);
                if ($r !== '') {
                    $parsedRoles[] = $r;
                }
            }
        }

        if ($user->hasRole($parsedRoles)) {
            return $next($request);
        }

        return response()->json(['message' => 'Forbidden. Insufficient role permissions.'], 403);
    }
}
