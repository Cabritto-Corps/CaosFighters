<?php

namespace App\Http\Controllers;

use App\Services\BattleService;
use App\Services\MatchmakingService;
use App\Repositories\BattleRepository;
use App\Events\MatchFound;
use App\Events\BattleAttackReceived;
use App\Http\Responses\ApiResponse;
use App\Http\Requests\StartBattleRequest;
use App\Http\Requests\ExecuteAttackRequest;
use App\Http\Requests\EndBattleRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class BattleController extends Controller
{
    public function __construct(
        protected BattleService $battleService,
        protected BattleRepository $battleRepository,
        protected MatchmakingService $matchmakingService
    ) {}

    /**
     * Get battle details by ID
     * GET /api/battles/{battleId}
     */
    public function show(Request $request, string $battleId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string|uuid',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError('Validation failed', $validator->errors());
        }

        try {
            $userId = $request->get('user_id');
            $battleDetails = $this->battleRepository->getBattleDetailsForUser($battleId, $userId);

            if (!$battleDetails) {
                return ApiResponse::notFound('Battle not found or you do not have access to it');
            }

            return ApiResponse::success($battleDetails, 'Battle details retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve battle details', $e->getMessage());
        }
    }

    /**
     * Get user's battle history
     * GET /api/battles/history?user_id={userId}&limit={limit}
     */
    public function history(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string|uuid',
            'limit' => 'sometimes|integer|min:1|max:100'
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError('Validation failed', $validator->errors());
        }

        try {
            $userId = $request->get('user_id');
            $limit = $request->get('limit', 50);

            $battles = $this->battleRepository->getUserBattlesHistory($userId, $limit);

            return ApiResponse::success($battles, 'Battle history retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve battle history', $e->getMessage());
        }
    }

    /**
     * Start a new battle
     * POST /api/battles/start
     */
    public function start(StartBattleRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            $isMultiplayer = $validated['is_multiplayer'] ?? false;

            $result = $this->battleService->startBattle(
                $validated['user_id'],
                $validated['character_user_id'],
                $isMultiplayer
            );

            return $result['success']
                ? ApiResponse::success($result['data'], 'Battle started')
                : ApiResponse::error($result['message'], $result['error'] ?? null);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to start battle', $e->getMessage());
        }
    }

    /**
     * Join matchmaking queue
     * POST /api/battles/matchmaking/join
     */
    public function joinMatchmaking(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string|uuid',
            'character_user_id' => 'required|string|uuid',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError('Validation failed', $validator->errors());
        }

        try {
            $validated = $validator->validated();
            $result = $this->matchmakingService->joinQueue(
                $validated['user_id'],
                $validated['character_user_id']
            );

            if (!$result['success']) {
                return ApiResponse::error($result['message'], $result['error'] ?? null);
            }

            // Process all matches in the queue (not just for this player)
            error_log(sprintf(
                '[MATCHMAKING] Processing matches for user: %s',
                $validated['user_id']
            ));
            $matches = $this->matchmakingService->processMatches();

            // Log to console (stderr)
            error_log(sprintf(
                '[MATCHMAKING] Matches found after joining queue - User ID: %s, Matches Count: %d',
                $validated['user_id'],
                count($matches)
            ));

            Log::info('Matches found after joining queue', [
                'user_id' => $validated['user_id'],
                'matches_count' => count($matches),
            ]);

            // Check if this player was matched
            $playerMatch = null;
            foreach ($matches as $match) {
                error_log(sprintf(
                    '[MATCHMAKING] Checking match - Player1: %s, Player2: %s, Current User: %s',
                    $match['player1']['user_id'],
                    $match['player2']['user_id'],
                    $validated['user_id']
                ));
                
                if ($match['player1']['user_id'] === $validated['user_id']) {
                    $playerMatch = [
                        'opponent_user_id' => $match['player2']['user_id'],
                        'opponent_character_user_id' => $match['player2']['character_user_id'],
                        'player_character_user_id' => $match['player1']['character_user_id'],
                    ];
                    error_log(sprintf(
                        '[MATCHMAKING] Player matched as Player1 - Opponent: %s',
                        $match['player2']['user_id']
                    ));
                    break;
                } elseif ($match['player2']['user_id'] === $validated['user_id']) {
                    $playerMatch = [
                        'opponent_user_id' => $match['player1']['user_id'],
                        'opponent_character_user_id' => $match['player1']['character_user_id'],
                        'player_character_user_id' => $match['player2']['character_user_id'],
                    ];
                    error_log(sprintf(
                        '[MATCHMAKING] Player matched as Player2 - Opponent: %s',
                        $match['player1']['user_id']
                    ));
                    break;
                }
            }
            
            if (!$playerMatch && count($matches) > 0) {
                error_log(sprintf(
                    '[MATCHMAKING] WARNING: Matches found but current user (%s) was not matched',
                    $validated['user_id']
                ));
            }

            // If this player was matched, start the battle
            if ($playerMatch) {
                error_log(sprintf(
                    '[MATCHMAKING] Calling startMultiplayerBattle with - Player1 ID: %s, Player1 Character: %s, Player2 ID: %s, Player2 Character: %s',
                    $validated['user_id'],
                    $validated['character_user_id'],
                    $playerMatch['opponent_user_id'],
                    $playerMatch['opponent_character_user_id']
                ));

                $battleResult = $this->battleService->startMultiplayerBattle(
                    $validated['user_id'],
                    $validated['character_user_id'],
                    $playerMatch['opponent_user_id'],
                    $playerMatch['opponent_character_user_id']
                );

                if ($battleResult['success']) {
                    // Save pending match data for HTTP polling fallback
                    $this->matchmakingService->storePendingMatch(
                        $battleResult['data'],
                        $validated['user_id'],
                        $playerMatch['opponent_user_id']
                    );

                    error_log(sprintf(
                        '[MATCHMAKING] Starting battle for players - Player1: %s, Player2: %s, Battle ID: %s',
                        $validated['user_id'],
                        $playerMatch['opponent_user_id'],
                        $battleResult['data']['battle_id'] ?? 'unknown'
                    ));

                    // Broadcast match found event to both players via Reverb
                    // Use try-catch to prevent broadcast errors from blocking the HTTP response
                    try {
                        error_log('[MATCHMAKING] Attempting to broadcast match found events via Reverb');
                        event(new MatchFound($validated['user_id'], $battleResult['data']));
                        event(new MatchFound($playerMatch['opponent_user_id'], $battleResult['data']));
                        error_log('[MATCHMAKING] Broadcast events dispatched successfully');
                    } catch (\Exception $e) {
                        // Log error but don't fail the request
                        error_log(sprintf(
                            '[MATCHMAKING] ERROR: Failed to broadcast match found events - %s',
                            $e->getMessage()
                        ));
                        Log::error('Failed to broadcast match found events', [
                            'user_id' => $validated['user_id'],
                            'opponent_user_id' => $playerMatch['opponent_user_id'],
                            'battle_id' => $battleResult['data']['battle_id'] ?? null,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                        ]);
                    }

                    // Return match found data (even if broadcast failed)
                    error_log(sprintf(
                        '[MATCHMAKING] Returning match found response - Battle ID: %s',
                        $battleResult['data']['battle_id'] ?? 'unknown'
                    ));
                    return ApiResponse::success([
                        'match_found' => true,
                        'battle' => $battleResult['data'],
                    ], 'Match found! Battle started');
                } else {
                    error_log(sprintf(
                        '[MATCHMAKING] ERROR: Failed to start battle - %s',
                        $battleResult['message'] ?? 'Unknown error'
                    ));
                }
            }

            // Process other matches that were found (for other players)
            foreach ($matches as $match) {
                if (
                    $match['player1']['user_id'] !== $validated['user_id'] &&
                    $match['player2']['user_id'] !== $validated['user_id']
                ) {
                    // This match is for other players, start their battle
                    Log::info('Starting battle for other players', [
                        'player1_id' => $match['player1']['user_id'],
                        'player2_id' => $match['player2']['user_id'],
                    ]);

                    $battleResult = $this->battleService->startMultiplayerBattle(
                        $match['player1']['user_id'],
                        $match['player1']['character_user_id'],
                        $match['player2']['user_id'],
                        $match['player2']['character_user_id']
                    );

                    if ($battleResult['success']) {
                        // Save pending match data for HTTP polling fallback
                        $this->matchmakingService->storePendingMatch(
                            $battleResult['data'],
                            $match['player1']['user_id'],
                            $match['player2']['user_id']
                        );

                        error_log(sprintf(
                            '[MATCHMAKING] Starting battle for other players - Player1: %s, Player2: %s, Battle ID: %s',
                            $match['player1']['user_id'],
                            $match['player2']['user_id'],
                            $battleResult['data']['battle_id'] ?? 'unknown'
                        ));

                        // Broadcast match found event to both players via Reverb
                        try {
                            error_log('[MATCHMAKING] Attempting to broadcast match found events for other players');
                            event(new MatchFound($match['player1']['user_id'], $battleResult['data']));
                            event(new MatchFound($match['player2']['user_id'], $battleResult['data']));
                            error_log('[MATCHMAKING] Broadcast events for other players dispatched successfully');
                        } catch (\Exception $e) {
                            error_log(sprintf(
                                '[MATCHMAKING] ERROR: Failed to broadcast for other players - %s',
                                $e->getMessage()
                            ));
                            Log::error('Failed to broadcast match found events for other players', [
                                'player1_id' => $match['player1']['user_id'],
                                'player2_id' => $match['player2']['user_id'],
                                'battle_id' => $battleResult['data']['battle_id'] ?? null,
                                'error' => $e->getMessage(),
                            ]);
                        }

                        Log::info('Battle started and events broadcasted for other players', [
                            'battle_id' => $battleResult['data']['battle_id'] ?? null,
                        ]);
                    } else {
                        Log::error('Failed to start battle for other players', [
                            'error' => $battleResult['message'] ?? 'Unknown error',
                        ]);
                    }
                }
            }

            // No match found yet - keep in queue
            // The WebSocket server will handle matchmaking polling

            return ApiResponse::success($result, 'Joined matchmaking queue');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to join matchmaking', $e->getMessage());
        }
    }

    /**
     * Leave matchmaking queue
     * POST /api/battles/matchmaking/leave
     */
    public function leaveMatchmaking(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string|uuid',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError('Validation failed', $validator->errors());
        }

        try {
            $validated = $validator->validated();
            $result = $this->matchmakingService->leaveQueue($validated['user_id']);

            return $result['success']
                ? ApiResponse::success($result, 'Left matchmaking queue')
                : ApiResponse::error($result['message'], $result['error'] ?? null);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to leave matchmaking', $e->getMessage());
        }
    }

    /**
     * Check matchmaking status for the authenticated user.
     * GET /api/battles/matchmaking/status?user_id={userId}
     */
    public function matchmakingStatus(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string|uuid',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError('Validation failed', $validator->errors());
        }

        try {
            $validated = $validator->validated();

            // Process matches in queue (in case someone else joined)
            $matches = $this->matchmakingService->processMatches();

            // Process any matches found
            foreach ($matches as $match) {
                $battleResult = $this->battleService->startMultiplayerBattle(
                    $match['player1']['user_id'],
                    $match['player1']['character_user_id'],
                    $match['player2']['user_id'],
                    $match['player2']['character_user_id']
                );

                if ($battleResult['success']) {
                    // Save pending match data for HTTP polling fallback
                    $this->matchmakingService->storePendingMatch(
                        $battleResult['data'],
                        $match['player1']['user_id'],
                        $match['player2']['user_id']
                    );

                    // Broadcast match found event to both players via Reverb
                    event(new MatchFound($match['player1']['user_id'], $battleResult['data']));
                    event(new MatchFound($match['player2']['user_id'], $battleResult['data']));
                }
            }

            // Check if this user has a pending match
            $pendingMatch = $this->matchmakingService->pullPendingMatch($validated['user_id']);

            if ($pendingMatch) {
                return ApiResponse::success($pendingMatch, 'Match found');
            }

            return ApiResponse::success([
                'match_found' => false,
            ], 'Still searching for opponent');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to check matchmaking status', $e->getMessage());
        }
    }

    /**
     * Execute an attack in a battle
     * POST /api/battles/{battleId}/attack
     */
    public function attack(ExecuteAttackRequest $request, string $battleId): JsonResponse
    {
        try {
            $validated = $request->validated();

            $result = $this->battleService->executeAttack(
                $battleId,
                $validated['user_id'],
                $validated['move_id']
            );

            return $result['success']
                ? ApiResponse::success($result['data'], 'Attack executed')
                : ApiResponse::error($result['message'], $result['error'] ?? null);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to execute attack', $e->getMessage());
        }
    }

    /**
     * End a battle
     * POST /api/battles/{battleId}/end
     */
    public function end(EndBattleRequest $request, string $battleId): JsonResponse
    {
        try {
            $validated = $request->validated();

            $result = $this->battleService->endBattle(
                $battleId,
                $validated['winner_id'],
                $validated['duration'] ?? null,
                $validated['battle_log'] ?? null
            );

            return $result['success']
                ? ApiResponse::success($result['data'], 'Battle ended')
                : ApiResponse::error($result['message'], $result['error'] ?? null);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return ApiResponse::validationError('Validation failed', $e->errors());
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to end battle', $e->getMessage());
        }
    }
}
