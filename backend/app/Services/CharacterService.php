<?php

namespace App\Services;

use App\Models\Character;
use App\Models\CharacterUser;
use App\Models\CharacterMove;
use App\Models\Move;
use Illuminate\Support\Facades\Log;

class CharacterService
{
    /**
     * Character assignment duration in hours
     */
    private const ASSIGNMENT_DURATION_HOURS = 12;

    /**
     * Assign a random character to a user.
     */
    public function assignRandomCharacterToUser(string $userId): array
    {
        try {
            // Get a random character from all available characters
            $character = Character::with(['tier', 'characterMoves.move'])
                ->inRandomOrder()
                ->first();

            if (!$character) {
                return [
                    'success' => false,
                    'message' => 'No characters available'
                ];
            }

            // Get 4 random moves from the moves table
            $characterMovesData = $this->getRandomMoves();

            // Create character assignment
            Log::info('Creating character_user assignment', [
                'user_id' => $userId,
                'character_id' => $character->id,
                'character_name' => $character->name
            ]);

            $characterUser = CharacterUser::create([
                'user_id' => $userId,
                'character_id' => $character->id,
                'moves' => $characterMovesData,
                'assigned_date' => now()->toDateString(),
                'created_at' => now(),
            ]);

            Log::info('Character_user assignment created successfully', [
                'character_user_id' => $characterUser->id,
                'user_id' => $characterUser->user_id,
                'character_id' => $characterUser->character_id,
                'created_at' => $characterUser->created_at
            ]);

            return [
                'success' => true,
                'message' => 'Character assigned successfully',
                'data' => [
                    'character' => [
                        'id' => $character->id,
                        'name' => $character->name,
                        'form_id' => $character->form_id,
                        'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$character->form_id}.png",
                        'status' => $character->status,
                        'tier' => $character->tier,
                    ],
                    'assignment' => [
                        'assigned_at' => $characterUser->created_at->toISOString(),
                        'expires_at' => $characterUser->expires_at->toISOString(),
                    ],
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
            Log::info('getUserCurrentCharacter called', ['user_id' => $userId]);

            // Get the most recent character assignment
            $characterUser = CharacterUser::with(['character.tier'])
                ->where('user_id', $userId)
                ->latest('created_at')
                ->first();

            Log::info('Character user lookup result', [
                'user_id' => $userId,
                'character_user_found' => $characterUser ? true : false,
                'character_user_id' => $characterUser ? $characterUser->id : null,
                'is_expired' => $characterUser ? $characterUser->isExpired() : null
            ]);

            // Check if user has no character or current character is expired
            if (!$characterUser || $characterUser->isExpired()) {
                Log::info('No character or expired, generating new assignment', [
                    'user_id' => $userId,
                    'has_character' => $characterUser ? true : false,
                    'is_expired' => $characterUser ? $characterUser->isExpired() : null
                ]);
                // Generate new character assignment
                return $this->assignRandomCharacterToUser($userId);
            }

            // Return current valid character using saved moves from character_user
            $characterMovesData = $characterUser->moves;

            return [
                'success' => true,
                'data' => [
                    'character' => [
                        'id' => $characterUser->character->id,
                        'name' => $characterUser->character->name,
                        'form_id' => $characterUser->character->form_id,
                        'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$characterUser->character->form_id}.png",
                        'status' => $characterUser->character->status,
                        'tier' => $characterUser->character->tier,
                    ],
                    'assignment' => [
                        'assigned_at' => $characterUser->created_at->toISOString(),
                        'expires_at' => $characterUser->expires_at->toISOString(),
                    ],
                    'moves' => $characterMovesData,
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

            // Character is still valid, use saved moves from character_user
            $characterMovesData = $characterUser->moves;

            return [
                'success' => true,
                'message' => 'Character is still valid',
                'data' => [
                    'character' => [
                        'id' => $characterUser->character->id,
                        'name' => $characterUser->character->name,
                        'form_id' => $characterUser->character->form_id,
                        'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$characterUser->character->form_id}.png",
                        'status' => $characterUser->character->status,
                        'tier' => $characterUser->character->tier,
                    ],
                    'assignment' => [
                        'assigned_at' => $characterUser->created_at->toISOString(),
                        'expires_at' => $characterUser->expires_at->toISOString(),
                    ],
                    'moves' => $characterMovesData,
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
                $characterMovesData = $characterUser->moves;

                return [
                    'success' => false,
                    'message' => 'Character regeneration is on cooldown',
                    'error' => 'You must wait 12 hours before generating a new character',
                    'cooldown' => [
                        'expires_at' => $characterUser->expires_at->toISOString(),
                        'hours_remaining' => $timeRemaining,
                    ],
                    'data' => [
                        'character' => [
                            'id' => $characterUser->character->id,
                            'name' => $characterUser->character->name,
                            'form_id' => $characterUser->character->form_id,
                            'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$characterUser->character->form_id}.png",
                            'status' => $characterUser->character->status,
                            'tier' => $characterUser->character->tier,
                        ],
                        'assignment' => [
                            'assigned_at' => $characterUser->created_at->toISOString(),
                            'expires_at' => $characterUser->expires_at->toISOString(),
                        ],
                        'moves' => $characterMovesData,
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
     * Get character moves data from character_moves table.
     */
    public function getCharacterWithMoves(string $characterId): array
    {
        try {
            $character = Character::with(['tier', 'characterMoves.move'])
                ->find($characterId);

            if (!$character) {
                return [
                    'success' => false,
                    'message' => 'Character not found'
                ];
            }

            $characterMovesData = $this->getCharacterMovesData($characterId);

            return [
                'success' => true,
                'data' => [
                    'character' => [
                        'id' => $character->id,
                        'name' => $character->name,
                        'form_id' => $character->form_id,
                        'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$character->form_id}.png",
                        'status' => $character->status,
                        'tier' => $character->tier,
                    ],
                    'moves' => $characterMovesData,
                ]
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get character with moves', [
                'character_id' => $characterId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to get character moves',
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
     * Get character moves data formatted for the API response.
     */
    private function getCharacterMovesData(string $characterId): array
    {
        try {
            $characterMoves = CharacterMove::with('move')
                ->where('character_id', $characterId)
                ->orderBy('move_slot')
                ->get();

            return $characterMoves->map(function ($characterMove) {
                return [
                    'slot' => $characterMove->move_slot,
                    'move' => [
                        'id' => $characterMove->move->id,
                        'name' => $characterMove->move->move_name,
                        'info' => $characterMove->move->move_info,
                    ]
                ];
            })->toArray();
        } catch (\Exception $e) {
            Log::error('Failed to get character moves data', [
                'character_id' => $characterId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Get a random character without user assignment (for no-auth mode).
     */
    public function getRandomCharacter(): array
    {
        try {
            // Get a random character from all available characters
            $character = Character::with(['tier', 'characterMoves.move'])
                ->inRandomOrder()
                ->first();

            if (!$character) {
                return [
                    'success' => false,
                    'message' => 'No characters available'
                ];
            }

            // Get character moves for the moves data
            $characterMovesData = $this->getCharacterMovesData($character->id);

            return [
                'success' => true,
                'message' => 'Character retrieved successfully',
                'data' => [
                    'character' => [
                        'id' => $character->id,
                        'name' => $character->name,
                        'form_id' => $character->form_id,
                        'image_url' => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$character->form_id}.png",
                        'status' => $character->status,
                        'tier' => $character->tier,
                    ],
                    'assignment' => [
                        'assigned_at' => now()->toISOString(),
                        'expires_at' => now()->addHours(12)->toISOString(),
                    ],
                    'moves' => $characterMovesData,
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
