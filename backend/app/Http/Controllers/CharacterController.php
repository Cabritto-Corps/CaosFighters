<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Services\CharacterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CharacterController extends Controller
{
    protected $characterService;

    public function __construct()
    {
        $this->characterService = app(CharacterService::class);
    }
    /**
     * Display a listing of characters.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Character::with('tier');

            // Filter by tier_id if provided
            if ($request->has('tier_id')) {
                $query->where('tier_id', $request->tier_id);
            }

            // Filter by name if provided
            if ($request->has('name')) {
                $query->where('name', 'like', '%' . $request->name . '%');
            }

            // Filter by status if provided
            if ($request->has('status')) {
                $query->whereJsonContains('status', $request->status);
            }

            // Order by name by default
            $orderBy = $request->get('order_by', 'name');
            $orderDirection = $request->get('order_direction', 'asc');

            if (in_array($orderBy, ['name', 'created_at', 'tier_id'])) {
                $query->orderBy($orderBy, $orderDirection);
            }

            // Pagination
            $perPage = $request->get('per_page', 15);
            $perPage = min($perPage, 100); // Limit max per page

            $characters = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $characters->items(),
                'pagination' => [
                    'current_page' => $characters->currentPage(),
                    'last_page' => $characters->lastPage(),
                    'per_page' => $characters->perPage(),
                    'total' => $characters->total(),
                    'from' => $characters->firstItem(),
                    'to' => $characters->lastItem(),
                ],
                'filters' => [
                    'tier_id' => $request->tier_id,
                    'name' => $request->name,
                    'status' => $request->status,
                    'order_by' => $orderBy,
                    'order_direction' => $orderDirection,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch characters',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified character.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $character = Character::with('tier')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $character
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Character not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch character',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get characters by tier.
     */
    public function byTier(int $tierId): JsonResponse
    {
        try {
            $characters = Character::with('tier')
                ->where('tier_id', $tierId)
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $characters,
                'count' => $characters->count(),
                'tier_id' => $tierId
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch characters by tier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current character (with optional user_id).
     */
    public function getCurrentCharacter(Request $request): JsonResponse
    {
        try {
            $userId = $request->get('user_id');

            Log::info('Character getCurrentCharacter called', [
                'user_id' => $userId ? 'provided' : 'not provided'
            ]);

            if ($userId) {
                // Get user's assigned character from character_user table
                $result = $this->characterService->getUserCurrentCharacter($userId);
            } else {
                // Return random character without authentication
                Log::info('Character getCurrentCharacter - returning random character');
                $result = $this->characterService->getRandomCharacter();
            }

            $httpStatus = $result['success'] ? 200 : 400;
            return response()->json($result, $httpStatus);
        } catch (\Exception $e) {
            Log::error('Character getCurrentCharacter error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get character',
                'error' => $e->getMessage()
            ], 500);
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

            Log::info('Character regenerateCharacter called', [
                'user_id' => $userId ? 'provided' : 'not provided'
            ]);

            if ($userId) {
                // Regenerate character for specific user
                $result = $this->characterService->regenerateCharacterForUser($userId);
            } else {
                // Return random character without authentication
                Log::info('Character regenerateCharacter - returning random character');
                $result = $this->characterService->getRandomCharacter();
            }

            $httpStatus = $result['success'] ? 200 : 400;
            return response()->json($result, $httpStatus);
        } catch (\Exception $e) {
            Log::error('Character regenerateCharacter error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to regenerate character',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
