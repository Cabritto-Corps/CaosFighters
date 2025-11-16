<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Authorize private user channels for matchmaking and events
// This corresponds to PrivateChannel('user.{userId}') on the backend
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return $user && (string) $user->id === (string) $userId;
});

// Authorize private battle channels
// This corresponds to PrivateChannel('battle.{battleId}') on the backend
Broadcast::channel('battle.{battleId}', function ($user, $battleId) {
    // For now, allow any authenticated user; in the future we can restrict
    // to only the two players of the battle.
    return (bool) $user;
});
