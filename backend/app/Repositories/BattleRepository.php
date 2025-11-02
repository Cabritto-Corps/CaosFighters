<?php

namespace App\Repositories;

use App\Models\Battle;

class BattleRepository
{
    /**
     * Create a new battle
     */
    public function createBattle(array $battleData): Battle
    {
        return Battle::create($battleData);
    }

    /**
     * Find battle by ID with relationships
     */
    public function findBattleById(string $battleId): ?Battle
    {
        return Battle::with(['character1', 'character2', 'player1', 'player2'])
            ->find($battleId);
    }

    /**
     * Update battle
     */
    public function updateBattle(Battle $battle, array $data): Battle
    {
        $battle->update($data);
        return $battle;
    }

    /**
     * Get battle with characters and relationships
     */
    public function getBattleWithCharacters(string $battleId): ?Battle
    {
        return Battle::with([
            'character1',
            'character2',
            'character1.tier',
            'character2.tier',
            'player1',
            'player2'
        ])->find($battleId);
    }
}
