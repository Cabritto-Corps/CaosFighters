<?php

namespace App\Http\Controllers;

use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LocationController extends Controller
{
    protected $locationService;

    public function __construct()
    {
        $this->locationService = app(LocationService::class);
    }

    /**
     * Update user location
     */
    public function updateLocation(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $result = $this->locationService->updateUserLocation(
            $request->user_id,
            $request->latitude,
            $request->longitude
        );

        $httpStatus = $result['success'] ? 200 : 400;
        return response()->json($result, $httpStatus);
    }

    /**
     * Get user's current location
     */
    public function getCurrentLocation(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $result = $this->locationService->getUserCurrentLocation($request->user_id);

        $httpStatus = $result['success'] ? 200 : 404;
        return response()->json($result, $httpStatus);
    }

    /**
     * Get user's location history
     */
    public function getLocationHistory(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string',
            'limit' => 'sometimes|integer|min:1|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $limit = $request->get('limit', 50);

        $result = $this->locationService->getUserLocationHistory($request->user_id, $limit);

        $httpStatus = $result['success'] ? 200 : 400;
        return response()->json($result, $httpStatus);
    }

    /**
     * Get all safe spots
     */
    public function getSafeSpots(): JsonResponse
    {
        $result = $this->locationService->getSafeSpots();

        $httpStatus = $result['success'] ? 200 : 400;
        return response()->json($result, $httpStatus);
    }

    /**
     * Test endpoint to check if location service is working
     */
    public function test(): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'message' => 'Location service is working',
                'timestamp' => now(),
                'test_data' => [
                    'latitude' => -23.5505,
                    'longitude' => -46.6333,
                    'proximity_radius' => 100
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error in location service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check for nearby users and battle opportunities
     */
    public function checkNearbyUsers(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Update location first
        $updateResult = $this->locationService->updateUserLocation(
            $request->user_id,
            $request->latitude,
            $request->longitude
        );

        if (!$updateResult['success']) {
            return response()->json($updateResult, 400);
        }

        // Return the location update result which includes nearby users and battle opportunities
        return response()->json($updateResult);
    }

    /**
     * Get user's proximity status
     */
    public function getProximityStatus(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Get current location
        $locationResult = $this->locationService->getUserCurrentLocation($request->user_id);

        if (!$locationResult['success']) {
            return response()->json([
                'success' => false,
                'message' => 'No location data available'
            ], 404);
        }

        $location = $locationResult['data'];

        // Check for nearby users and safe spots
        $nearbyUsers = $this->locationService->findNearbyUsers(
            $request->user_id,
            $location['latitude'],
            $location['longitude']
        );

        $safeSpot = $this->locationService->findNearestSafeSpot(
            $location['latitude'],
            $location['longitude']
        );

        return response()->json([
            'success' => true,
            'data' => [
                'location' => $location,
                'nearby_users' => $nearbyUsers,
                'safe_spot' => $safeSpot,
                'is_in_safe_spot' => $safeSpot !== null,
                'can_battle' => $safeSpot === null && count($nearbyUsers) > 0,
                'battle_opportunities' => $safeSpot === null && count($nearbyUsers) > 0
                    ? $this->locationService->prepareBattleOpportunities($request->user_id, $nearbyUsers)
                    : []
            ]
        ]);
    }
}
