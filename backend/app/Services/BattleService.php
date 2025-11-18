<?php

namespace App\Services;

use App\Models\Battle;
use App\Models\CharacterUser;
use App\Models\Move;
use App\Services\Contracts\BattleServiceInterface;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class BattleService implements BattleServiceInterface
{
    // Bot user ID for AI opponents
    private const BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

    public function __construct(
        private CharacterService $characterService
    ) {}

    /**
     * Start a new battle between player and a bot (or multiplayer via dedicated method).
     * This implementation only handles bot battles; multiplayer uses startMultiplayerBattle.
     */
    public function startBattle(string $userId, string $playerCharacterUserId): array
    {
        return $this->startBotBattle($userId, $playerCharacterUserId);
    }

    /**
     * Start a new battle between player and a bot
     */
    public function startBotBattle(string $userId, string $playerCharacterUserId): array
    {
        try {
            // Get player's character assignment
            $playerCharacter = CharacterUser::with(['character', 'user'])
                ->find($playerCharacterUserId);

            if (!$playerCharacter || $playerCharacter->user_id !== $userId) {
                return [
                    'success' => false,
                    'message' => 'Invalid character assignment',
                    'error' => 'Character not found or does not belong to user'
                ];
            }

            // Generate a random bot opponent (must be different from player's character)
            $botCharacter = $this->generateBotOpponent($playerCharacter->character_id);

            if (!$botCharacter) {
                return [
                    'success' => false,
                    'message' => 'Could not generate bot opponent',
                    'error' => 'No characters available for bot'
                ];
            }

            // Create battle record (player1 vs bot player2)
            $battle = Battle::create([
                'player1_id' => $userId,
                'player2_id' => self::BOT_USER_ID, // Use dedicated bot user
                'character1_id' => $playerCharacter->character_id,
                'character2_id' => $botCharacter['character_id'],
                'battle_log' => [],
                'battle_timestamp' => now(),
                'is_multiplayer' => false,
            ]);

            Log::info('Battle started', [
                'battle_id' => $battle->id,
                'player_id' => $userId,
                'player_character_id' => $playerCharacter->character_id,
                'bot_character_id' => $botCharacter['character_id'],
            ]);

            return [
                'success' => true,
                'data' => [
                    'battle_id' => $battle->id,
                    'player_id' => $userId,  // Return actual user ID for winner validation
                    'player_character' => [
                        'character_user_id' => $playerCharacter->id,
                        'character' => [
                            'id' => $playerCharacter->character->id,
                            'name' => $playerCharacter->character->name,
                            'form_id' => $playerCharacter->character->form_id,
                            'image_url' => $playerCharacter->character->image_url,
                            'tier' => $playerCharacter->character->tier,
                        ],
                        'status' => $playerCharacter->status,
                        'moves' => $playerCharacter->moves,
                    ],
                    'bot_character' => [
                        'character_id' => $botCharacter['character_id'],
                        'character' => [
                            'id' => $botCharacter['character']->id,
                            'name' => $botCharacter['character']->name,
                            'form_id' => $botCharacter['character']->form_id,
                            'image_url' => $botCharacter['character']->image_url,
                            'tier' => $botCharacter['character']->tier,
                        ],
                        'status' => $botCharacter['status'],
                        'moves' => $botCharacter['moves'],
                    ],
                    'turn' => 'player', // Player always goes first
                ]
            ];
        } catch (\Exception $e) {
            Log::error('Failed to start battle', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to start battle',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Process an attack in a battle
     */
    public function executeAttack(string $battleId, string $attackerId, string $moveId): array
    {
        try {
            $battle = Battle::find($battleId);

            if (!$battle) {
                return [
                    'success' => false,
                    'message' => 'Battle not found'
                ];
            }

            // Get move details
            $move = Move::find($moveId);

            if (!$move) {
                return [
                    'success' => false,
                    'message' => 'Move not found'
                ];
            }

            // Calculate damage
            $damage = $this->calculateDamage($move, $attackerId, $battleId);

            // Determine if attack hits
            $accuracy = $move->move_info['accuracy'] ?? 100;
            if (rand(1, 100) > $accuracy) {
                Log::info('Attack missed', [
                    'battle_id' => $battleId,
                    'attacker_id' => $attackerId,
                    'move_id' => $moveId,
                ]);

                return [
                    'success' => true,
                    'damage' => 0,
                    'hit' => false,
                    'message' => 'Attack missed!',
                    'turn' => $attackerId === $battle->player1_id ? 'enemy' : 'player',
                ];
            }

            // Update battle log
            $battleLog = $battle->battle_log ?? [];
            $battleLog[] = [
                'attacker_id' => $attackerId,
                'move_id' => $moveId,
                'move_name' => $move->move_name,
                'damage' => $damage,
                'timestamp' => now()->toIso8601String(),
            ];

            $battle->update(['battle_log' => $battleLog]);

            $nextTurn = $attackerId === $battle->player1_id ? 'enemy' : 'player';

            // Get attacker and defender character assignments for HP calculation
            $attackerCharacterId = $attackerId === $battle->player1_id
                ? $battle->character1_id
                : $battle->character2_id;
            $defenderCharacterId = $attackerId === $battle->player1_id
                ? $battle->character2_id
                : $battle->character1_id;

            $attackerAssignment = CharacterUser::where('character_id', $attackerCharacterId)->first();
            $defenderAssignment = CharacterUser::where('character_id', $defenderCharacterId)->first();

            // Calculate current HP (simplified - in real implementation, track HP in battle state)
            $defenderCurrentHp = $defenderAssignment ? ($defenderAssignment->status['hp'] ?? 100) - $damage : 100 - $damage;
            $defenderCurrentHp = max(0, $defenderCurrentHp);

            // Check if battle ended
            $battleEnded = $defenderCurrentHp <= 0;
            $winnerId = $battleEnded ? $attackerId : null;

            Log::info('Attack executed', [
                'battle_id' => $battleId,
                'attacker_id' => $attackerId,
                'move_id' => $moveId,
                'damage' => $damage,
                'next_turn' => $nextTurn,
                'battle_ended' => $battleEnded,
            ]);

            return [
                'success' => true,
                'damage' => $damage,
                'hit' => true,
                'turn' => $nextTurn,
                'message' => "Attack dealt {$damage} damage!",
                'move_name' => $move->move_name,
                'enemy_current_hp' => $defenderCurrentHp,
                'is_finished' => $battleEnded,
                'winner_id' => $winnerId,
                'data' => [
                    'damage' => $damage,
                    'move_name' => $move->move_name,
                    'enemy_current_hp' => $defenderCurrentHp,
                    'turn' => $nextTurn,
                    'is_finished' => $battleEnded,
                    'winner_id' => $winnerId,
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Failed to execute attack', [
                'battle_id' => $battleId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to execute attack',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * End battle and award points to winner
     */
    public function endBattle(string $battleId, string $winnerId, ?int $duration = null, ?array $battleLog = null): array
    {
        try {
            $battle = Battle::with(['character1.tier', 'character2.tier', 'player1', 'player2'])
                ->find($battleId);

            if (!$battle) {
                return [
                    'success' => false,
                    'message' => 'Battle not found'
                ];
            }

            // Use provided duration or calculate it
            $finalDuration = $duration ?? $battle->battle_timestamp->diffInSeconds(now());

            // Award points
            $pointsAwarded = $this->calculatePointsAwarded($winnerId, $battle);

            // Prepare update data
            $updateData = [
                'winner_id' => $winnerId,
                'points_awarded' => $pointsAwarded,
                'duration' => $finalDuration,
            ];

            // Add battle log if provided
            if ($battleLog !== null) {
                $updateData['battle_log'] = $battleLog;
            }

            // Update battle
            $battle->update($updateData);

            // Award points to winner
            $winner = $battle->player1;
            if ($winnerId === $battle->player2_id) {
                $winner = $battle->player2;
            }

            $winner->points += $pointsAwarded;
            $winner->save();

            Log::info('Battle ended', [
                'battle_id' => $battleId,
                'winner_id' => $winnerId,
                'duration' => $finalDuration,
                'points_awarded' => $pointsAwarded,
            ]);

            return [
                'success' => true,
                'data' => [
                    'battle_id' => $battleId,
                    'winner_id' => $winnerId,
                    'points_awarded' => $pointsAwarded,
                    'duration' => $finalDuration,
                ],
                'message' => "Battle ended! {$pointsAwarded} points awarded!"
            ];
        } catch (\Exception $e) {
            Log::error('Failed to end battle', [
                'battle_id' => $battleId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to end battle',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Generate a bot opponent with random character.
     * Optionally exclude a specific character ID to satisfy DB constraints
     * (e.g. battles must have different characters).
     */
    private function generateBotOpponent(?string $excludeCharacterId = null): ?array
    {
        try {
            $maxAttempts = 5;
            $attempt = 0;

            while ($attempt < $maxAttempts) {
                $attempt++;

                // Use injected CharacterService to generate random character
                $result = $this->characterService->getRandomCharacter();

                if (!$result['success']) {
                    return null;
                }

                $data = $result['data'];
                $characterId = $data['character']['id'] ?? null;

                // If no exclusion or different character, use it
                if ($excludeCharacterId === null || $characterId !== $excludeCharacterId) {
                    return [
                        'character_id' => $characterId,
                        'character' => (object) $data['character'],
                        'status' => $data['status'],
                        'moves' => $data['moves'],
                    ];
                }
            }

            Log::warning('Failed to generate distinct bot opponent after max attempts', [
                'exclude_character_id' => $excludeCharacterId,
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('Failed to generate bot opponent', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Calculate damage for an attack
     * Formula: move_power + (attacker_strength - defender_defense) * 0.1
     */
    private function calculateDamage($move, string $attackerId, string $battleId): int
    {
        try {
            $battle = Battle::with(['character1', 'character2'])
                ->find($battleId);

            // Get attacker's character
            $attackerCharacterId = $attackerId === $battle->player1_id
                ? $battle->character1_id
                : $battle->character2_id;

            // Get defender's character
            $defenderCharacterId = $attackerId === $battle->player1_id
                ? $battle->character2_id
                : $battle->character1_id;

            // Get character assignments with status
            $attackerAssignment = CharacterUser::where('character_id', $attackerCharacterId)->first();
            $defenderAssignment = CharacterUser::where('character_id', $defenderCharacterId)->first();

            $basePower = $move->move_info['power'] ?? 40;

            if (!$attackerAssignment || !$defenderAssignment) {
                return (int) $basePower;
            }

            $attackerStrength = $attackerAssignment->status['strength'] ?? 100;
            $defenderDefense = $defenderAssignment->status['defense'] ?? 100;

            $damage = (int) ($basePower + ($attackerStrength - $defenderDefense) * 0.1);

            // Ensure minimum damage is 1
            return max(1, $damage);
        } catch (\Exception $e) {
            Log::error('Failed to calculate damage', [
                'error' => $e->getMessage()
            ]);
            return 40; // Default damage
        }
    }

    /**
     * Calculate points awarded for winning a battle
     */
    private function calculatePointsAwarded(string $winnerId, Battle $battle): int
    {
        try {
            $basePoints = 50;

            // Ensure relationships are loaded
            if (!$battle->relationLoaded('character1') || !$battle->relationLoaded('character2')) {
                $battle->load(['character1.tier', 'character2.tier']);
            }

            // Get tier difference (bonus for winning against stronger opponent)
            $winnerCharacterId = $winnerId === $battle->player1_id
                ? $battle->character1_id
                : $battle->character2_id;

            $loserCharacterId = $winnerId === $battle->player1_id
                ? $battle->character2_id
                : $battle->character1_id;

            $winnerCharacter = $battle->character1;
            $loserCharacter = $battle->character2;

            if ($winnerId === $battle->player2_id) {
                $winnerCharacter = $battle->character2;
                $loserCharacter = $battle->character1;
            }

            // Check if tiers are loaded
            if (!$winnerCharacter->relationLoaded('tier') || !$loserCharacter->relationLoaded('tier')) {
                return $basePoints; // Return base points if tiers not available
            }

            $tierDiff = $winnerCharacter->tier->id - $loserCharacter->tier->id;

            // Bonus multiplier: 1.5x if winning against stronger opponent, 1x otherwise
            $multiplier = $tierDiff < 0 ? 1.5 : 1.0;

            return (int) ($basePoints * $multiplier);
        } catch (\Exception $e) {
            Log::error('Failed to calculate points', [
                'error' => $e->getMessage()
            ]);
            return 50; // Default points
        }
    }

    /**
     * Start a multiplayer battle between two players
     */
    public function startMultiplayerBattle(
        string $player1Id,
        string $player1CharacterUserId,
        string $player2Id,
        string $player2CharacterUserId
    ): array {
        try {
            error_log(sprintf(
                '[BATTLE] startMultiplayerBattle called - Player1 ID: %s, Player1 Character: %s, Player2 ID: %s, Player2 Character: %s',
                $player1Id,
                $player1CharacterUserId,
                $player2Id,
                $player2CharacterUserId
            ));

            // Get both players' character assignments
            $player1Character = CharacterUser::with(['character', 'user'])
                ->find($player1CharacterUserId);

            $player2Character = CharacterUser::with(['character', 'user'])
                ->find($player2CharacterUserId);

            error_log(sprintf(
                '[BATTLE] Character lookup - Player1 Character found: %s, belongs to user: %s, expected user: %s',
                $player1Character ? 'yes' : 'no',
                $player1Character ? $player1Character->user_id : 'N/A',
                $player1Id
            ));

            error_log(sprintf(
                '[BATTLE] Character lookup - Player2 Character found: %s, belongs to user: %s, expected user: %s',
                $player2Character ? 'yes' : 'no',
                $player2Character ? $player2Character->user_id : 'N/A',
                $player2Id
            ));

            if (!$player1Character || $player1Character->user_id !== $player1Id) {
                error_log(sprintf(
                    '[BATTLE] ERROR: Invalid player 1 character assignment - Character found: %s, Character user_id: %s, Expected user_id: %s',
                    $player1Character ? 'yes' : 'no',
                    $player1Character ? $player1Character->user_id : 'N/A',
                    $player1Id
                ));
                return [
                    'success' => false,
                    'message' => 'Invalid player 1 character assignment',
                    'error' => 'Character not found or does not belong to user',
                ];
            }

            if (!$player2Character || $player2Character->user_id !== $player2Id) {
                error_log(sprintf(
                    '[BATTLE] ERROR: Invalid player 2 character assignment - Character found: %s, Character user_id: %s, Expected user_id: %s',
                    $player2Character ? 'yes' : 'no',
                    $player2Character ? $player2Character->user_id : 'N/A',
                    $player2Id
                ));
                return [
                    'success' => false,
                    'message' => 'Invalid player 2 character assignment',
                    'error' => 'Character not found or does not belong to user',
                ];
            }

            // Create battle record (player1 vs player2)
            $battle = Battle::create([
                'player1_id' => $player1Id,
                'player2_id' => $player2Id,
                'character1_id' => $player1Character->character_id,
                'character2_id' => $player2Character->character_id,
                'battle_log' => [],
                'battle_timestamp' => now(),
                'is_multiplayer' => true,
            ]);

            Log::info('Multiplayer battle started', [
                'battle_id' => $battle->id,
                'player1_id' => $player1Id,
                'player2_id' => $player2Id,
                'player1_character_id' => $player1Character->character_id,
                'player2_character_id' => $player2Character->character_id,
            ]);


            return [
                'success' => true,
                'data' => [
                    'battle_id' => $battle->id,
                    'player1_id' => $player1Id,
                    'player2_id' => $player2Id,
                    'player1_character' => [
                        'character_user_id' => $player1Character->id,
                        'character' => [
                            'id' => $player1Character->character->id,
                            'name' => $player1Character->character->name,
                            'form_id' => $player1Character->character->form_id,
                            'image_url' => $player1Character->character->image_url,
                            'tier' => $player1Character->character->tier,
                        ],
                        'status' => $player1Character->status,
                        'moves' => $player1Character->moves,
                    ],
                    'player2_character' => [
                        'character_user_id' => $player2Character->id,
                        'character' => [
                            'id' => $player2Character->character->id,
                            'name' => $player2Character->character->name,
                            'form_id' => $player2Character->character->form_id,
                            'image_url' => $player2Character->character->image_url,
                            'tier' => $player2Character->character->tier,
                        ],
                        'status' => $player2Character->status,
                        'moves' => $player2Character->moves,
                    ],
                    'turn' => 'player', // Player 1 always goes first
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Failed to start multiplayer battle', [
                'player1_id' => $player1Id,
                'player2_id' => $player2Id ?? 'unknown',
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to start multiplayer battle',
                'error' => $e->getMessage(),
            ];
        }
    }
}
