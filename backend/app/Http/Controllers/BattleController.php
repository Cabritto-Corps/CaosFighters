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

class BattleController extends Controller
{
    public function __construct(
        protected BattleService $battleService,
        protected BattleRepository $battleRepository,
        protected MatchmakingService $matchmakingService
    ) {
    }

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

            // Try to find a match immediately
            $match = $this->matchmakingService->findMatch($validated['user_id']);

            if ($match) {
                // Match found! Start battle
                $battleResult = $this->battleService->startMultiplayerBattle(
                    $validated['user_id'],
                    $validated['character_user_id'],
                    $match['opponent_user_id'],
                    $match['opponent_character_user_id']
                );

                if ($battleResult['success']) {
                    // Broadcast match found event to both players via Reverb
                    event(new MatchFound($validated['user_id'], $battleResult['data']));
                    event(new MatchFound($match['opponent_user_id'], $battleResult['data']));
                    
                    // Return match found data
                    return ApiResponse::success([
                        'match_found' => true,
                        'battle' => $battleResult['data'],
                    ], 'Match found! Battle started');
                }
            }
            
            // No match found yet - keep in queue
            // The WebSocket server will handle matchmaking polling

            return $result['success']
                ? ApiResponse::success($result, 'Joined matchmaking queue')
                : ApiResponse::error($result['message'], $result['error'] ?? null);
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
