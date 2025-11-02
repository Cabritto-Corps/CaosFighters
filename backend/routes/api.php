<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BattleController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Health Check Routes
Route::prefix('health')->group(function () {
    Route::get('/ping', [HealthController::class, 'ping']);
});

// Authentication Routes (no auth required)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::post('/update-push-token', [AuthController::class, 'updatePushToken']);
});

// User Management Routes (no auth required)
Route::apiResource('users', UserController::class);

// Character Routes
Route::prefix('characters')->group(function () {
    Route::get('/', [CharacterController::class, 'index']);
    Route::get('/tier/{tierId}', [CharacterController::class, 'byTier']);
    Route::get('/current', [CharacterController::class, 'getCurrentCharacter']);
    Route::post('/regenerate', [CharacterController::class, 'regenerateCharacter']);
    Route::get('/{id}', [CharacterController::class, 'show']); // This must be last to avoid conflicts
});

// Battle Routes
Route::prefix('battles')->group(function () {
    Route::post('/start', [BattleController::class, 'start']);
    Route::post('/{battleId}/attack', [BattleController::class, 'attack']);
    Route::post('/{battleId}/end', [BattleController::class, 'end']);
});

// Location Routes (no auth required)
Route::prefix('location')->group(function () {
    Route::post('/update', [LocationController::class, 'updateLocation']);
    Route::get('/current', [LocationController::class, 'getCurrentLocation']);
    Route::get('/history', [LocationController::class, 'getLocationHistory']);
    Route::get('/nearby', [LocationController::class, 'checkNearbyUsers']);
    Route::get('/proximity-status', [LocationController::class, 'getProximityStatus']);
    Route::get('/safe-spots', [LocationController::class, 'getSafeSpots']);
    Route::get('/test', [LocationController::class, 'test']);
});

