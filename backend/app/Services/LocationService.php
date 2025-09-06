<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserLocationHistory;
use App\Models\SafeSpot;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LocationService
{
    /**
     * Battle proximity radius in meters
     */
    private const BATTLE_PROXIMITY_RADIUS = 100;

    protected $notificationService;

    public function __construct()
    {
        $this->notificationService = app(NotificationService::class);
    }

    /**
     * Update user location and check for nearby battles
     */
    public function updateUserLocation(string $userId, float $latitude, float $longitude): array
    {
        try {
            // Validate coordinates
            if (!$this->isValidCoordinates($latitude, $longitude)) {
                return [
                    'success' => false,
                    'message' => 'Invalid coordinates'
                ];
            }

            // Save location history
            UserLocationHistory::create([
                'user_id' => $userId,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'timestamp' => now()
            ]);

            // Check for nearby users
            $nearbyUsers = $this->findNearbyUsers($userId, $latitude, $longitude);

            // Check if user is in a safe spot
            $safeSpot = $this->findNearestSafeSpot($latitude, $longitude);
            $isInSafeSpot = $safeSpot !== null;

            $result = [
                'success' => true,
                'message' => 'Location updated successfully',
                'data' => [
                    'location' => [
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                        'timestamp' => now()
                    ],
                    'nearby_users' => $nearbyUsers,
                    'safe_spot' => $safeSpot,
                    'is_in_safe_spot' => $isInSafeSpot,
                    'can_battle' => !$isInSafeSpot && count($nearbyUsers) > 0
                ]
            ];

            // If user can battle and there are nearby users, prepare battle notifications
            if (!$isInSafeSpot && count($nearbyUsers) > 0) {
                $result['battle_opportunities'] = $this->prepareBattleOpportunities($userId, $nearbyUsers);

                // Send notifications to nearby users
                $this->sendProximityNotifications($userId, $nearbyUsers, $result['battle_opportunities']);
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('Location update failed', [
                'user_id' => $userId,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to update location',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get user's current location
     */
    public function getUserCurrentLocation(string $userId): array
    {
        try {
            $latestLocation = UserLocationHistory::where('user_id', $userId)
                ->orderBy('timestamp', 'desc')
                ->first();

            if (!$latestLocation) {
                return [
                    'success' => false,
                    'message' => 'No location data found for user'
                ];
            }

            return [
                'success' => true,
                'data' => [
                    'latitude' => $latestLocation->latitude,
                    'longitude' => $latestLocation->longitude,
                    'timestamp' => $latestLocation->timestamp->toISOString()
                ]
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get user location',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get user's location history
     */
    public function getUserLocationHistory(string $userId, int $limit = 50): array
    {
        try {
            $locations = UserLocationHistory::where('user_id', $userId)
                ->orderBy('timestamp', 'desc')
                ->limit($limit)
                ->get();

            return [
                'success' => true,
                'data' => $locations->map(function ($location) {
                    return [
                        'latitude' => $location->latitude,
                        'longitude' => $location->longitude,
                        'timestamp' => $location->timestamp->toISOString()
                    ];
                })
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get location history',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Find nearby users within battle proximity
     */
    public function findNearbyUsers(string $userId, float $latitude, float $longitude): array
    {
        // Get recent locations of other users (last 5 minutes)
        $recentTime = now()->subMinutes(5);

        $nearbyUsers = UserLocationHistory::select('user_id', 'latitude', 'longitude', 'timestamp')
            ->where('user_id', '!=', $userId)
            ->where('timestamp', '>=', $recentTime)
            ->with('user:id,name,points,ranking,status')
            ->get()
            ->filter(function ($location) use ($latitude, $longitude) {
                $distance = $this->calculateDistance(
                    $latitude,
                    $longitude,
                    $location->latitude,
                    $location->longitude
                );
                return $distance <= self::BATTLE_PROXIMITY_RADIUS;
            })
            ->map(function ($location) use ($latitude, $longitude) {
                $distance = $this->calculateDistance(
                    $latitude,
                    $longitude,
                    $location->latitude,
                    $location->longitude
                );

                return [
                    'user_id' => $location->user_id,
                    'name' => $location->user->name,
                    'points' => $location->user->points,
                    'ranking' => $location->user->ranking,
                    'status' => $location->user->status,
                    'latitude' => $location->latitude,
                    'longitude' => $location->longitude,
                    'distance_meters' => round($distance),
                    'last_seen' => $location->timestamp->toISOString()
                ];
            })
            ->values()
            ->toArray();

        return $nearbyUsers;
    }

    /**
     * Find nearest safe spot
     */
    public function findNearestSafeSpot(float $latitude, float $longitude): ?array
    {
        $safeSpots = SafeSpot::all();

        $nearestSpot = null;
        $minDistance = PHP_FLOAT_MAX;

        foreach ($safeSpots as $spot) {
            $distance = $this->calculateDistance(
                $latitude,
                $longitude,
                $spot->latitude,
                $spot->longitude
            );

            if ($distance < $minDistance) {
                $minDistance = $distance;
                $nearestSpot = [
                    'id' => $spot->id,
                    'name' => $spot->name,
                    'latitude' => $spot->latitude,
                    'longitude' => $spot->longitude,
                    'distance_meters' => round($distance)
                ];
            }
        }

        // Consider safe if within 50 meters of a safe spot
        return ($minDistance <= 50) ? $nearestSpot : null;
    }

    /**
     * Prepare battle opportunities for notifications
     */
    public function prepareBattleOpportunities(string $userId, array $nearbyUsers): array
    {
        $battleOpportunities = [];

        foreach ($nearbyUsers as $nearbyUser) {
            $battleOpportunities[] = [
                'opponent' => [
                    'user_id' => $nearbyUser['user_id'],
                    'name' => $nearbyUser['name'],
                    'points' => $nearbyUser['points'],
                    'ranking' => $nearbyUser['ranking']
                ],
                'distance_meters' => $nearbyUser['distance_meters'],
                'battle_id' => $this->generateBattleId($userId, $nearbyUser['user_id']),
                'expires_at' => now()->addSeconds(30)->toISOString() // 30 second window
            ];
        }

        return $battleOpportunities;
    }

    /**
     * Generate a unique battle ID
     */
    private function generateBattleId(string $userId1, string $userId2): string
    {
        $ids = [$userId1, $userId2];
        sort($ids);
        return 'battle_' . md5($ids[0] . '_' . $ids[1] . '_' . now()->timestamp);
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     */
    private function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // Earth's radius in meters

        $lat1Rad = deg2rad($lat1);
        $lon1Rad = deg2rad($lon1);
        $lat2Rad = deg2rad($lat2);
        $lon2Rad = deg2rad($lon2);

        $deltaLat = $lat2Rad - $lat1Rad;
        $deltaLon = $lon2Rad - $lon1Rad;

        $a = sin($deltaLat / 2) * sin($deltaLat / 2) +
            cos($lat1Rad) * cos($lat2Rad) *
            sin($deltaLon / 2) * sin($deltaLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Validate coordinates
     */
    private function isValidCoordinates(float $latitude, float $longitude): bool
    {
        return $latitude >= -90 && $latitude <= 90 &&
            $longitude >= -180 && $longitude <= 180;
    }

    /**
     * Get all safe spots
     */
    public function getSafeSpots(): array
    {
        try {
            $safeSpots = SafeSpot::all();

            return [
                'success' => true,
                'data' => $safeSpots->map(function ($spot) {
                    return [
                        'id' => $spot->id,
                        'name' => $spot->name,
                        'latitude' => $spot->latitude,
                        'longitude' => $spot->longitude,
                        'created_at' => $spot->created_at->toISOString()
                    ];
                })
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get safe spots',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Send proximity notifications to nearby users
     */
    private function sendProximityNotifications(string $userId, array $nearbyUsers, array $battleOpportunities): void
    {
        try {
            // Get current user info
            $currentUser = User::find($userId);
            if (!$currentUser) {
                return;
            }

            // For each nearby user, send a battle invitation
            foreach ($nearbyUsers as $nearbyUser) {
                // Find the corresponding battle opportunity
                $battleOpportunity = collect($battleOpportunities)
                    ->firstWhere('opponent.user_id', $nearbyUser['user_id']);

                if ($battleOpportunity) {
                    // Get the nearby user's Expo push token (you'll need to add this to your User model)
                    $nearbyUserModel = User::find($nearbyUser['user_id']);

                    if ($nearbyUserModel && isset($nearbyUserModel->expo_push_token)) {
                        // Send battle invitation notification
                        $this->notificationService->sendBattleInvitation(
                            $nearbyUserModel->expo_push_token,
                            $battleOpportunity
                        );
                    }
                }
            }

            // Send proximity alert to current user
            if (isset($currentUser->expo_push_token)) {
                $this->notificationService->sendProximityAlert(
                    $currentUser->expo_push_token,
                    [
                        'nearby_count' => count($nearbyUsers),
                        'can_battle' => true,
                        'is_safe_spot' => false
                    ]
                );
            }
        } catch (\Exception $e) {
            Log::error('Failed to send proximity notifications', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Send safe spot notification
     */
    private function sendSafeSpotNotification(string $userId, array $safeSpot): void
    {
        try {
            $user = User::find($userId);

            if ($user && isset($user->expo_push_token)) {
                $this->notificationService->sendSafeSpotNotification(
                    $user->expo_push_token,
                    $safeSpot
                );
            }
        } catch (\Exception $e) {
            Log::error('Failed to send safe spot notification', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
        }
    }
}
