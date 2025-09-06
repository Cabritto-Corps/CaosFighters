<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BenchmarkController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Health Check Routes
Route::prefix('health')->group(function () {
    Route::get('/check', [HealthController::class, 'check']);
    Route::get('/detailed', [HealthController::class, 'detailed']);
    Route::get('/ping', [HealthController::class, 'ping']);
});

// Public Routes
Route::get('/hello', function () {
    return response()->json(['message' => 'Hello World!']);
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
    Route::get('/{id}', [CharacterController::class, 'show']);
    Route::get('/tier/{tierId}', [CharacterController::class, 'byTier']);
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

// Benchmark Routes
Route::prefix('benchmark')->group(function () {
    Route::get('/users/{iterations?}', [BenchmarkController::class, 'users']);
});
// });
