<?php

namespace App\Repositories;

use App\Models\Battle;
use App\Services\BattleService;

class BattleRepository
{
    public function __construct(
        protected BattleService $battleService
    ) {}
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

    /**
     * Get user's battle history
     */
    public function getUserBattlesHistory(string $userId, int $limit = 50): array
    {
        $battles = Battle::where(function ($query) use ($userId) {
            $query->where('player1_id', $userId)
                  ->orWhere('player2_id', $userId);
        })
        ->whereNotNull('winner_id') // Only completed battles
        ->with([
            'player1:id,name',
            'player2:id,name',
            'character1:id,name,form_id',
            'character2:id,name,form_id',
            'character1.tier:id,name',
            'character2.tier:id,name',
            'winner:id,name'
        ])
        ->orderBy('battle_timestamp', 'desc')
        ->limit($limit)
        ->get();

        return $battles->map(function ($battle) use ($userId) {
            $isPlayer1 = $battle->player1_id === $userId;
            $opponent = $isPlayer1 ? $battle->player2 : $battle->player1;
            $opponentCharacter = $isPlayer1 ? $battle->character2 : $battle->character1;
            $userCharacter = $isPlayer1 ? $battle->character1 : $battle->character2;
            $isWinner = $battle->winner_id === $userId;

            return [
                'id' => $battle->id,
                'opponent' => [
                    'id' => $opponent->id ?? '',
                    'name' => $opponent->name ?? 'Bot',
                ],
                'opponent_character' => [
                    'id' => $opponentCharacter->id ?? '',
                    'name' => $opponentCharacter->name ?? 'Desconhecido',
                    'form_id' => $opponentCharacter->form_id ?? 0,
                    'tier' => $opponentCharacter->tier ? [
                        'id' => $opponentCharacter->tier->id,
                        'name' => $opponentCharacter->tier->name,
                    ] : null,
                ],
                'user_character' => [
                    'id' => $userCharacter->id ?? '',
                    'name' => $userCharacter->name ?? 'Desconhecido',
                    'form_id' => $userCharacter->form_id ?? 0,
                    'tier' => $userCharacter->tier ? [
                        'id' => $userCharacter->tier->id,
                        'name' => $userCharacter->tier->name,
                    ] : null,
                ],
                'winner_id' => $battle->winner_id,
                'is_winner' => $isWinner,
                'points_awarded' => $isWinner ? ($battle->points_awarded ?? 0) : null,
                'battle_timestamp' => $battle->battle_timestamp->toISOString(),
                'duration' => $battle->duration,
                'battle_log' => $battle->battle_log ?? [],
            ];
        })->toArray();
    }

    /**
     * Get battle details by ID for a specific user
     */
    public function getBattleDetailsForUser(string $battleId, string $userId): ?array
    {
        $battle = Battle::with([
            'player1:id,name',
            'player2:id,name',
            'character1:id,name,form_id',
            'character2:id,name,form_id',
            'character1.tier:id,name',
            'character2.tier:id,name',
            'winner:id,name'
        ])->find($battleId);

        if (!$battle) {
            return null;
        }

        // Check if user participated in this battle
        if ($battle->player1_id !== $userId && $battle->player2_id !== $userId) {
            return null;
        }

        $isPlayer1 = $battle->player1_id === $userId;
        $opponent = $isPlayer1 ? $battle->player2 : $battle->player1;
        $opponentCharacter = $isPlayer1 ? $battle->character2 : $battle->character1;
        $userCharacter = $isPlayer1 ? $battle->character1 : $battle->character2;
        $isWinner = $battle->winner_id === $userId;

        // Calculate current HP for both players
        $playerHp = $this->battleService->calculateCurrentHP($battleId, $userId);
        $opponentId = $isPlayer1 ? $battle->player2_id : $battle->player1_id;
        $opponentHp = $this->battleService->calculateCurrentHP($battleId, $opponentId);

        // Determine waiting status for multiplayer battles
        $waitingForOpponent = false;
        if ($battle->is_multiplayer && !$battle->winner_id) {
            // Check if current user has pending attack but opponent doesn't
            $userPendingField = $isPlayer1 ? 'player1_pending_attack' : 'player2_pending_attack';
            $opponentPendingField = $isPlayer1 ? 'player2_pending_attack' : 'player1_pending_attack';
            $userHasPending = !empty($battle->$userPendingField);
            $opponentHasPending = !empty($battle->$opponentPendingField);
            
            // Waiting if user has pending attack but opponent doesn't
            $waitingForOpponent = $userHasPending && !$opponentHasPending;
        }

        return [
            'id' => $battle->id,
            'opponent' => [
                'id' => $opponent->id ?? '',
                'name' => $opponent->name ?? 'Bot',
            ],
            'opponent_character' => [
                'id' => $opponentCharacter->id ?? '',
                'name' => $opponentCharacter->name ?? 'Desconhecido',
                'form_id' => $opponentCharacter->form_id ?? 0,
                'tier' => $opponentCharacter->tier ? [
                    'id' => $opponentCharacter->tier->id,
                    'name' => $opponentCharacter->tier->name,
                ] : null,
            ],
            'user_character' => [
                'id' => $userCharacter->id ?? '',
                'name' => $userCharacter->name ?? 'Desconhecido',
                'form_id' => $userCharacter->form_id ?? 0,
                'tier' => $userCharacter->tier ? [
                    'id' => $userCharacter->tier->id,
                    'name' => $userCharacter->tier->name,
                ] : null,
            ],
            'winner_id' => $battle->winner_id,
            'is_winner' => $isWinner,
            'points_awarded' => $isWinner ? ($battle->points_awarded ?? 0) : null,
            'battle_timestamp' => $battle->battle_timestamp->toISOString(),
            'duration' => $battle->duration,
            'battle_log' => $battle->battle_log ?? [],
            'player_hp' => $playerHp,
            'opponent_hp' => $opponentHp,
            'waiting_for_opponent' => $waitingForOpponent,
            'current_turn_round' => $battle->current_turn_round ?? 0,
        ];
    }
}
