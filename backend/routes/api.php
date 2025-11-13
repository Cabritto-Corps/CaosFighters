<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BattleController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\RankingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Health Check Routes
Route::prefix('health')->group(function () {
    Route::get('/ping', [HealthController::class, 'ping']);
});

// Authentication Routes
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('/refresh', [AuthController::class, 'refresh'])->middleware('auth:sanctum');
    Route::post('/update-push-token', [AuthController::class, 'updatePushToken'])->middleware('auth:sanctum');
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
    Route::get('/history', [BattleController::class, 'history']);
    Route::get('/{battleId}', [BattleController::class, 'show']);
    Route::post('/start', [BattleController::class, 'start']);
    Route::post('/{battleId}/attack', [BattleController::class, 'attack']);
    Route::post('/{battleId}/end', [BattleController::class, 'end']);
    Route::post('/matchmaking/join', [BattleController::class, 'joinMatchmaking']);
    Route::post('/matchmaking/leave', [BattleController::class, 'leaveMatchmaking']);
    Route::get('/matchmaking/status', [BattleController::class, 'matchmakingStatus']);
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

// Ranking Routes (no auth required)
Route::prefix('ranking')->group(function () {
    Route::get('/', [RankingController::class, 'index']);
    Route::get('/position/{userId}', [RankingController::class, 'getUserPosition']);
});

// Notification Routes (auth required)
Route::prefix('notifications')->middleware('auth:sanctum')->group(function () {
    Route::get('/preferences', [NotificationsController::class, 'getPreferences']);
    Route::post('/preferences', [NotificationsController::class, 'updatePreferences']);
});

