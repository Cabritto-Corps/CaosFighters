<?php

use App\Http\Master\Controllers\RegisterController;
use Illuminate\Support\Facades\Route;

Route::prefix('user')->group(function () {
    Route::post('/register', RegisterController::class);
});

// set middlewares in bootstrap/app.php
Route::middleware(['auth.user'])->prefix('public/account')->group(function () {
    // Additional routes can be added here
});

Route::get('/ping', function () {
    return response()->json(['ok' => true]);
});
