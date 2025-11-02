<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Services\CharacterService;
use App\Repositories\CharacterRepository;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CharacterController extends Controller
{
    public function __construct(
        protected CharacterService $characterService,
        protected CharacterRepository $characterRepository
    ) {
    }
    /**
     * Display a listing of characters.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = [
                'tier_id' => $request->get('tier_id'),
                'name' => $request->get('name'),
                'status' => $request->get('status'),
                'order_by' => $request->get('order_by', 'name'),
                'order_direction' => $request->get('order_direction', 'asc'),
                'per_page' => $request->get('per_page', 15),
            ];

            $characters = $this->characterRepository->getPaginatedCharacters($filters);

            return ApiResponse::success([
                'characters' => $characters->items(),
                'pagination' => [
                    'current_page' => $characters->currentPage(),
                    'last_page' => $characters->lastPage(),
                    'per_page' => $characters->perPage(),
                    'total' => $characters->total(),
                    'from' => $characters->firstItem(),
                    'to' => $characters->lastItem(),
                ],
                'filters' => $filters
            ], 'Characters fetched successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to fetch characters', $e->getMessage());
        }
    }

    /**
     * Display the specified character.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $character = $this->characterRepository->getCharacterById($id);

            if (!$character) {
                return ApiResponse::notFound('Character not found');
            }

            return ApiResponse::success($character, 'Character fetched successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to fetch character', $e->getMessage());
        }
    }

    /**
     * Get characters by tier.
     */
    public function byTier(int $tierId): JsonResponse
    {
        try {
            $characters = $this->characterRepository->getCharactersByTierId($tierId);

            return ApiResponse::success([
                'characters' => $characters,
                'count' => $characters->count(),
                'tier_id' => $tierId
            ], 'Characters by tier fetched successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to fetch characters by tier', $e->getMessage());
        }
    }

    /**
     * Get current character (with optional user_id).
     */
    public function getCurrentCharacter(Request $request): JsonResponse
    {
        try {
            $userId = $request->get('user_id');

            if ($userId) {
                // Get user's assigned character from character_user table
                $result = $this->characterService->getUserCurrentCharacter($userId);
            } else {
                // Return random character without authentication
                $result = $this->characterService->getRandomCharacter();
            }

            return $result['success']
                ? ApiResponse::success($result['data'], 'Character fetched successfully')
                : ApiResponse::error($result['message'], $result['error'] ?? null);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to get character', $e->getMessage());
        }
    }

    /**
     * Regenerate character (with optional user_id).
     */
    public function regenerateCharacter(Request $request): JsonResponse
    {
        try {
            // Try to get user_id from both query and body
            $userId = $request->get('user_id') ?? $request->input('user_id');

            if ($userId) {
                // Regenerate character for specific user
                $result = $this->characterService->regenerateCharacterForUser($userId);
            } else {
                // Return random character without authentication
                $result = $this->characterService->getRandomCharacter();
            }

            return $result['success']
                ? ApiResponse::success($result['data'], 'Character regenerated successfully')
                : ApiResponse::error($result['message'], $result['error'] ?? null);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to regenerate character', $e->getMessage());
        }
    }
}
