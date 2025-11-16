<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['message' => 'CaosFighters API'];
});

// Broadcasting authentication route - support both web (session) and API (token) auth
Broadcast::routes(['middleware' => ['web']]);

// Custom broadcasting auth route for API tokens
Route::post('/broadcasting/auth', function (\Illuminate\Http\Request $request) {
    \Illuminate\Support\Facades\Log::info('Broadcasting auth request', [
        'has_bearer_token' => $request->bearerToken() !== null,
        'channel_name' => $request->input('channel_name'),
    ]);

    // Try to authenticate via Sanctum token first
    if ($request->bearerToken()) {
        $user = \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable;
        if ($user) {
            \Illuminate\Support\Facades\Auth::login($user);
            \Illuminate\Support\Facades\Log::info('User authenticated via token', [
                'user_id' => $user->id,
            ]);
        }
    }

    // Fall back to default Broadcast auth
    return Broadcast::auth($request);
})->middleware(['api']);
