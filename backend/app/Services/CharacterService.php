<?php

namespace App\Services;

use App\Models\Character;
use App\Models\CharacterUser;
use App\Models\Move;
use App\Services\Contracts\CharacterServiceInterface;
use App\Repositories\CharacterRepository;
use App\Repositories\CharacterUserRepository;
use Illuminate\Support\Facades\Log;

class CharacterService implements CharacterServiceInterface
{
    /**
     * Character assignment duration in hours
     */
    private const ASSIGNMENT_DURATION_HOURS = 12;

    public function __construct(
        private CharacterRepository $characterRepository,
        private CharacterUserRepository $characterUserRepository
    ) {
    }

    /**
     * Assign a random character to a user.
     */
    public function assignRandomCharacterToUser(string $userId): array
    {
        try {
            // Get a random character from all available characters
            $character = $this->characterRepository->getRandomCharacter();

            if (!$character) {
                return [
                    'success' => false,
                    'message' => 'No characters available'
                ];
            }

            // Generate random status based on tier min/max
            $randomStatus = $this->generateRandomStatus($character->tier);

            // Get 4 random moves from the moves table
            $characterMovesData = $this->getRandomMoves();

            // Create character assignment
            $characterUser = $this->characterUserRepository->createAssignment([
                'user_id' => $userId,
                'character_id' => $character->id,
                'status' => $randomStatus,
                'moves' => $characterMovesData,
                'assigned_date' => now()->toDateString(),
                'created_at' => now(),
            ]);

            return [
                'success' => true,
                'message' => 'Character assigned successfully',
                'data' => [
                    'character_user_id' => $characterUser->id,
                    'character' => [
                        'id' => $character->id,
                        'name' => $character->name,
                        'form_id' => $character->form_id,
                        'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$character->form_id}.png",
                        'tier' => $character->tier,
                    ],
                    'assignment' => [
                        'assigned_at' => $characterUser->created_at->toISOString(),
                        'expires_at' => $characterUser->expires_at->toISOString(),
                    ],
                    'status' => $randomStatus,
                    'moves' => $characterMovesData,
                ]
            ];
        } catch (\Exception $e) {
            Log::error('Failed to assign random character to user', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to assign character',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get user's current character or generate new if expired/missing.
     */
    public function getUserCurrentCharacter(string $userId): array
    {
        try {
            // Get the most recent character assignment
            $characterUser = $this->characterUserRepository->getUserCharacter($userId);

            // Check if user has no character or current character is expired
            if (!$characterUser || $characterUser->isExpired()) {
                // Generate new character assignment
                return $this->assignRandomCharacterToUser($userId);
            }

            // Return current valid character using saved status and moves from character_user
            // Fallback to default status if not set (for backward compatibility with old records)
            $status = $characterUser->status ?? [
                'hp' => 100,
                'agility' => 100,
                'defense' => 100,
                'strength' => 100,
            ];

            return [
                'success' => true,
                'data' => [
                    'character_user_id' => $characterUser->id,
                    'character' => [
                        'id' => $characterUser->character->id,
                        'name' => $characterUser->character->name,
                        'form_id' => $characterUser->character->form_id,
                        'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$characterUser->character->form_id}.png",
                        'tier' => $characterUser->character->tier,
                    ],
                    'assignment' => [
                        'assigned_at' => $characterUser->created_at->toISOString(),
                        'expires_at' => $characterUser->expires_at->toISOString(),
                    ],
                    'status' => $status,
                    'moves' => $characterUser->moves,
                ]
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get user current character', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to get current character',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check expiration and regenerate character if needed.
     */
    public function checkAndRegenerateCharacter(string $userId): array
    {
        try {
            // Get the most recent character assignment
            $characterUser = CharacterUser::with(['character.tier'])
                ->where('user_id', $userId)
                ->latest('created_at')
                ->first();

            // If no character or expired, assign new one
            if (!$characterUser || $characterUser->isExpired()) {
                return $this->assignRandomCharacterToUser($userId);
            }

            // Character is still valid, use saved status and moves from character_user
            // Fallback to default status if not set (for backward compatibility with old records)
            $status = $characterUser->status ?? [
                'hp' => 100,
                'agility' => 100,
                'defense' => 100,
                'strength' => 100,
            ];

            return [
                'success' => true,
                'message' => 'Character is still valid',
                'data' => [
                    'character_user_id' => $characterUser->id,
                    'character' => [
                        'id' => $characterUser->character->id,
                        'name' => $characterUser->character->name,
                        'form_id' => $characterUser->character->form_id,
                        'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$characterUser->character->form_id}.png",
                        'tier' => $characterUser->character->tier,
                    ],
                    'assignment' => [
                        'assigned_at' => $characterUser->created_at->toISOString(),
                        'expires_at' => $characterUser->expires_at->toISOString(),
                    ],
                    'status' => $status,
                    'moves' => $characterUser->moves,
                ]
            ];
        } catch (\Exception $e) {
            Log::error('Failed to check and regenerate character', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to check character status',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Attempt to regenerate character for authenticated user, respecting 12-hour limit.
     */
    public function regenerateCharacterForUser(string $userId): array
    {
        try {
            // Get the most recent character assignment
            $characterUser = CharacterUser::with(['character.tier'])
                ->where('user_id', $userId)
                ->latest('created_at')
                ->first();

            // Check if user can regenerate (12 hours have passed or no character exists)
            if ($characterUser && !$characterUser->isExpired()) {
                // Character is still valid, cannot regenerate yet
                $timeRemaining = $characterUser->expires_at->diffInHours(now());

                // Fallback to default status if not set (for backward compatibility with old records)
                $status = $characterUser->status ?? [
                    'hp' => 100,
                    'agility' => 100,
                    'defense' => 100,
                    'strength' => 100,
                ];

                return [
                    'success' => false,
                    'message' => 'Character regeneration is on cooldown',
                    'error' => 'You must wait 12 hours before generating a new character',
                    'cooldown' => [
                        'expires_at' => $characterUser->expires_at->toISOString(),
                        'hours_remaining' => $timeRemaining,
                    ],
                    'data' => [
                        'character_user_id' => $characterUser->id,
                        'character' => [
                            'id' => $characterUser->character->id,
                            'name' => $characterUser->character->name,
                            'form_id' => $characterUser->character->form_id,
                            'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$characterUser->character->form_id}.png",
                            'tier' => $characterUser->character->tier,
                        ],
                        'assignment' => [
                            'assigned_at' => $characterUser->created_at->toISOString(),
                            'expires_at' => $characterUser->expires_at->toISOString(),
                        ],
                        'status' => $status,
                        'moves' => $characterUser->moves,
                    ]
                ];
            }

            // Either no character exists or current one is expired, generate new one
            return $this->assignRandomCharacterToUser($userId);
        } catch (\Exception $e) {
            Log::error('Failed to regenerate character for user', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to regenerate character',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get 4 random moves from the moves table.
     */
    private function getRandomMoves(): array
    {
        try {
            $moves = Move::inRandomOrder()->limit(4)->get();

            return $moves->map(function ($move, $index) {
                return [
                    'slot' => $index + 1,
                    'move' => [
                        'id' => $move->id,
                        'name' => $move->move_name,
                        'info' => $move->move_info,
                    ]
                ];
            })->toArray();
        } catch (\Exception $e) {
            Log::error('Failed to get random moves', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Generate random status for a character based on tier constraints.
     */
    private function generateRandomStatus($tier): array
    {
        try {
            $minStatus = $tier->min_status ?? [
                'hp' => 50,
                'agility' => 30,
                'defense' => 30,
                'strength' => 30,
            ];

            $maxStatus = $tier->max_status ?? [
                'hp' => 150,
                'agility' => 150,
                'defense' => 150,
                'strength' => 150,
            ];

            return [
                'hp' => rand($minStatus['hp'], $maxStatus['hp']),
                'agility' => rand($minStatus['agility'], $maxStatus['agility']),
                'defense' => rand($minStatus['defense'], $maxStatus['defense']),
                'strength' => rand($minStatus['strength'], $maxStatus['strength']),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to generate random status', [
                'error' => $e->getMessage()
            ]);

            // Return default status if generation fails
            return [
                'hp' => 100,
                'agility' => 100,
                'defense' => 100,
                'strength' => 100,
            ];
        }
    }

    /**
     * Get a random character without user assignment (for no-auth mode).
     */
    public function getRandomCharacter(): array
    {
        try {
            // Get a random character from all available characters
            $character = $this->characterRepository->getRandomCharacter();

            if (!$character) {
                return [
                    'success' => false,
                    'message' => 'No characters available'
                ];
            }

            // Generate random status based on tier
            $randomStatus = $this->generateRandomStatus($character->tier);

            // Get random moves
            $movesData = $this->getRandomMoves();

            return [
                'success' => true,
                'message' => 'Character retrieved successfully',
                'data' => [
                    'character' => [
                        'id' => $character->id,
                        'name' => $character->name,
                        'form_id' => $character->form_id,
                        'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$character->form_id}.png",
                        'tier' => $character->tier,
                    ],
                    'assignment' => [
                        'assigned_at' => now()->toISOString(),
                        'expires_at' => now()->addHours(12)->toISOString(),
                    ],
                    'status' => $randomStatus,
                    'moves' => $movesData,
                ]
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get random character', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to get random character',
                'error' => $e->getMessage()
            ];
        }
    }
}
