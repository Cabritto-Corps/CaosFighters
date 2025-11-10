<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['message' => 'CaosFighters API'];
});

// Broadcasting authentication route
Broadcast::routes(['middleware' => ['web']]);
