<?php

namespace App\Http\Master\Middleware;

use App\Infrastructure\Persistence\UserRepository;
use Closure;
use Illuminate\Http\Request;

class AuthUserMiddleware
{
    public function __construct(
        private UserRepository $userRepository,
    ) {}
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['message' => 'Missing authorization params'], 401);
        }

        $user = $this->userRepository->findByToken($token);
        if (!$user) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        $request->attributes->set('user', $user);

        return $next($request);
    }
}
