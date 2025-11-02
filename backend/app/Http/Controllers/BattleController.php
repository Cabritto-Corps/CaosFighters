<?php

namespace App\Http\Controllers;

use App\Services\BattleService;
use App\Http\Responses\ApiResponse;
use App\Http\Requests\StartBattleRequest;
use App\Http\Requests\ExecuteAttackRequest;
use App\Http\Requests\EndBattleRequest;
use Illuminate\Http\JsonResponse;

class BattleController extends Controller
{
    public function __construct(
        protected BattleService $battleService
    ) {
    }

    /**
     * Start a new battle
     * POST /api/battles/start
     */
    public function start(StartBattleRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $result = $this->battleService->startBattle(
                $validated['user_id'],
                $validated['character_user_id']
            );

            return $result['success']
                ? ApiResponse::success($result['data'], 'Battle started')
                : ApiResponse::error($result['message'], $result['error'] ?? null);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to start battle', $e->getMessage());
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
