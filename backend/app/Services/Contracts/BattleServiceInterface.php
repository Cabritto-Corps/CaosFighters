<?php

namespace App\Services\Contracts;

interface BattleServiceInterface
{
    /**
     * Start a new battle between player and bot
     */
    public function startBattle(string $userId, string $playerCharacterUserId): array;

    /**
     * Execute an attack in a battle
     */
    public function executeAttack(string $battleId, string $attackerId, string $moveId): array;

    /**
     * End a battle and award points to winner
     */
    public function endBattle(string $battleId, string $winnerId, ?int $duration = null, ?array $battleLog = null): array;
}
