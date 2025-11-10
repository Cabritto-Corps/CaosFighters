<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RankingController extends Controller
{
    /**
     * Get user ranking ordered by points
     * GET /api/ranking
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $limit = $request->get('limit', 100);
            $limit = min($limit, 500); // Max 500 users

            // Get users ordered by points descending, with position calculation
            $users = User::select('id', 'name', 'email', 'points', 'status', 'created_at')
                ->where('status', 'active')
                ->orderBy('points', 'desc')
                ->orderBy('created_at', 'asc') // Tie-breaker: older users rank higher
                ->limit($limit)
                ->get();

            // Calculate position for each user
            $position = 1;
            $previousPoints = null;
            $samePointsCount = 0;

            $ranking = $users->map(function ($user) use (&$position, &$previousPoints, &$samePointsCount) {
                // If points are different from previous, update position
                if ($previousPoints !== null && $user->points !== $previousPoints) {
                    $position += $samePointsCount;
                    $samePointsCount = 1;
                } else {
                    $samePointsCount++;
                }

                $previousPoints = $user->points;

                // Handle created_at safely - check if it's a Carbon instance or string
                $createdAt = null;
                if ($user->created_at) {
                    if (is_string($user->created_at)) {
                        $createdAt = $user->created_at;
                    } elseif (method_exists($user->created_at, 'toISOString')) {
                        $createdAt = $user->created_at->toISOString();
                    } else {
                        $createdAt = (string) $user->created_at;
                    }
                }

                return [
                    'rank' => $position,
                    'id' => $user->id,
                    'name' => $user->name,
                    'points' => $user->points,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $ranking->values()->all(),
                'count' => $ranking->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch ranking',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's position in ranking
     * GET /api/ranking/position/{userId}
     */
    public function getUserPosition(string $userId): JsonResponse
    {
        try {
            $user = User::findOrFail($userId);

            // Count users with more points
            $usersWithMorePoints = User::where('status', 'active')
                ->where(function ($query) use ($user) {
                    $query->where('points', '>', $user->points)
                        ->orWhere(function ($q) use ($user) {
                            $q->where('points', '=', $user->points)
                                ->where('created_at', '<', $user->created_at);
                        });
                })
                ->count();

            $position = $usersWithMorePoints + 1;

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'points' => $user->points,
                    'position' => $position,
                ]
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get user position',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

