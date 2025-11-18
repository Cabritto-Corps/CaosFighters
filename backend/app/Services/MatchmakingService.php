<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class MatchmakingService
{
    private const QUEUE_KEY = 'matchmaking_queue';
    private const QUEUE_TIMEOUT = 30; // seconds
    private const PENDING_MATCH_PREFIX = 'matchmaking_pending_';
    private const PENDING_MATCH_TTL = 60; // seconds

    /**
     * Add player to matchmaking queue
     */
    public function joinQueue(string $userId, string $characterUserId): array
    {
        try {
            $queue = $this->getQueue();

            // Check if user is already in queue
            $existingIndex = $this->findUserInQueue($queue, $userId);
            if ($existingIndex !== false) {
                return [
                    'success' => true,
                    'message' => 'Already in queue',
                    'queue_position' => $existingIndex + 1,
                ];
            }

            // Add to queue
            $queue[] = [
                'user_id' => $userId,
                'character_user_id' => $characterUserId,
                'joined_at' => now()->timestamp,
            ];

            $this->saveQueue($queue);

            Log::info('Player joined matchmaking queue', [
                'user_id' => $userId,
                'character_user_id' => $characterUserId,
                'queue_size' => count($queue),
            ]);

            return [
                'success' => true,
                'message' => 'Joined matchmaking queue',
                'queue_position' => count($queue),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to join matchmaking queue', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to join queue',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Remove player from matchmaking queue
     */
    public function leaveQueue(string $userId): array
    {
        try {
            $queue = $this->getQueue();
            $index = $this->findUserInQueue($queue, $userId);

            if ($index !== false) {
                array_splice($queue, $index, 1);
                $this->saveQueue($queue);

                Log::info('Player left matchmaking queue', [
                    'user_id' => $userId,
                ]);
            }

            return [
                'success' => true,
                'message' => 'Left matchmaking queue',
            ];
        } catch (\Exception $e) {
            Log::error('Failed to leave matchmaking queue', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to leave queue',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Try to find a match for a player
     * Returns opponent data if match found, null otherwise
     */
    public function findMatch(string $userId): ?array
    {
        try {
            $queue = $this->getQueue();
            $this->cleanExpiredEntries($queue);
            $this->saveQueue($queue);

            $playerIndex = $this->findUserInQueue($queue, $userId);
            if ($playerIndex === false) {
                return null; // Player not in queue
            }

            $player = $queue[$playerIndex];

            // Find another player in queue
            foreach ($queue as $index => $opponent) {
                if ($index !== $playerIndex && $opponent['user_id'] !== $userId) {
                    // Match found! Remove both from queue
                    array_splice($queue, max($playerIndex, $index), 1);
                    array_splice($queue, min($playerIndex, $index), 1);
                    $this->saveQueue($queue);

                    Log::info('Match found', [
                        'player1_id' => $userId,
                        'player2_id' => $opponent['user_id'],
                    ]);

                    error_log(sprintf(
                        '[MATCHMAKING] Match found - Player 1 ID: %s, Player 2 ID: %s',
                        $userId,
                        $opponent['user_id']
                    ));


                    return [
                        'opponent_user_id' => $opponent['user_id'],
                        'opponent_character_user_id' => $opponent['character_user_id'],
                        'player_character_user_id' => $player['character_user_id'],
                    ];
                }
            }

            return null; // No match found
        } catch (\Exception $e) {
            Log::error('Failed to find match', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Process all matches in the queue
     * Returns array of matches found: [['player1' => ..., 'player2' => ...], ...]
     */
    public function processMatches(): array
    {
        try {
            $queue = $this->getQueue();
            $this->cleanExpiredEntries($queue);

            $initialQueueSize = count($queue);
            $matches = [];

            Log::info('Processing matches', [
                'queue_size' => $initialQueueSize,
            ]);

            // Process matches while there are at least 2 players
            while (count($queue) >= 2) {
                $player1 = $queue[0];
                $player2 = $queue[1];

                // Remove both players from queue
                array_splice($queue, 0, 2);

                $matches[] = [
                    'player1' => $player1,
                    'player2' => $player2,
                ];

                Log::info('Match processed', [
                    'player1_id' => $player1['user_id'],
                    'player2_id' => $player2['user_id'],
                    'remaining_queue_size' => count($queue),
                ]);
            }

            // Save updated queue
            $this->saveQueue($queue);

            if (count($matches) > 0) {
                Log::info('Matches processed successfully', [
                    'matches_count' => count($matches),
                    'remaining_queue_size' => count($queue),
                ]);
            }

            return $matches;
        } catch (\Exception $e) {
            Log::error('Failed to process matches', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [];
        }
    }

    /**
     * Get current queue
     */
    private function getQueue(): array
    {
        return Cache::get(self::QUEUE_KEY, []);
    }

    /**
     * Save queue to cache
     */
    private function saveQueue(array $queue): void
    {
        Cache::put(self::QUEUE_KEY, $queue, now()->addMinutes(10));
    }

    /**
     * Find user index in queue
     */
    private function findUserInQueue(array $queue, string $userId): int|false
    {
        foreach ($queue as $index => $entry) {
            if ($entry['user_id'] === $userId) {
                return $index;
            }
        }

        return false;
    }

    /**
     * Remove expired entries from queue
     */
    private function cleanExpiredEntries(array &$queue): void
    {
        $now = now()->timestamp;
        $queue = array_filter($queue, function ($entry) use ($now) {
            return ($now - $entry['joined_at']) < self::QUEUE_TIMEOUT;
        });
        $queue = array_values($queue); // Re-index array
    }

    /**
     * Store pending match data for both players so they can retrieve via polling.
     */
    public function storePendingMatch(array $battleData, string $playerOneId, string $playerTwoId): void
    {
        $this->setPendingMatch($playerOneId, $battleData);
        $this->setPendingMatch($playerTwoId, $battleData);
    }

    /**
     * Retrieve pending match data for a player (one-time).
     */
    public function pullPendingMatch(string $userId): ?array
    {
        $key = $this->pendingMatchKey($userId);
        $data = Cache::get($key);

        if ($data) {
            Cache::forget($key);
        }

        return $data;
    }

    /**
     * Store pending match data for a single player.
     */
    private function setPendingMatch(string $userId, array $battleData): void
    {
        Cache::put(
            $this->pendingMatchKey($userId),
            [
                'match_found' => true,
                'battle' => $battleData,
            ],
            now()->addSeconds(self::PENDING_MATCH_TTL)
        );
    }

    /**
     * Build cache key for pending match.
     */
    private function pendingMatchKey(string $userId): string
    {
        return self::PENDING_MATCH_PREFIX . $userId;
    }
}
