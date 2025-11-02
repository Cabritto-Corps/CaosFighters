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
    ) {
    }

    /**
     * Start a new battle between player and a bot
     */
    public function startBattle(string $userId, string $playerCharacterUserId): array
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

            // Generate a random bot opponent
            $botCharacter = $this->generateBotOpponent();

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

            Log::info('Attack executed', [
                'battle_id' => $battleId,
                'attacker_id' => $attackerId,
                'move_id' => $moveId,
                'damage' => $damage,
                'next_turn' => $nextTurn,
            ]);

            return [
                'success' => true,
                'damage' => $damage,
                'hit' => true,
                'turn' => $nextTurn,
                'message' => "Attack dealt {$damage} damage!"
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
            $battle = Battle::find($battleId);

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
     * Generate a bot opponent with random character
     */
    private function generateBotOpponent(): ?array
    {
        try {
            // Use injected CharacterService to generate random character
            $result = $this->characterService->getRandomCharacter();

            if (!$result['success']) {
                return null;
            }

            $data = $result['data'];

            return [
                'character_id' => $data['character']['id'],
                'character' => (object) $data['character'],
                'status' => $data['status'],
                'moves' => $data['moves'],
            ];
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
}
