<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send battle invitation notification via Expo
     */
    public function sendBattleInvitation(string $expoPushToken, array $battleData): array
    {
        try {
            $notification = [
                'to' => $expoPushToken,
                'title' => '⚔️ Battle Opportunity!',
                'body' => "You're near {$battleData['opponent']['name']}! Tap to start a battle.",
                'data' => [
                    'type' => 'battle_invitation',
                    'battle_id' => $battleData['battle_id'],
                    'opponent' => $battleData['opponent'],
                    'distance_meters' => $battleData['distance_meters'],
                    'expires_at' => $battleData['expires_at']
                ],
                'sound' => 'default',
                'badge' => 1,
                'priority' => 'high',
                'channelId' => 'battle-notifications'
            ];

            $response = Http::post('https://exp.host/--/api/v2/push/send', [
                $notification
            ]);

            if ($response->successful()) {
                Log::info('Battle notification sent successfully', [
                    'expo_push_token' => $expoPushToken,
                    'battle_id' => $battleData['battle_id']
                ]);

                return [
                    'success' => true,
                    'message' => 'Battle notification sent successfully'
                ];
            } else {
                Log::error('Failed to send battle notification', [
                    'expo_push_token' => $expoPushToken,
                    'response' => $response->body()
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to send battle notification',
                    'error' => $response->body()
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception sending battle notification', [
                'expo_push_token' => $expoPushToken,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to send battle notification',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Send multiple battle invitations
     */
    public function sendMultipleBattleInvitations(array $notifications): array
    {
        try {
            $response = Http::post('https://exp.host/--/api/v2/push/send', $notifications);

            if ($response->successful()) {
                $results = $response->json();

                Log::info('Multiple battle notifications sent', [
                    'count' => count($notifications),
                    'results' => $results
                ]);

                return [
                    'success' => true,
                    'message' => 'Battle notifications sent successfully',
                    'results' => $results
                ];
            } else {
                Log::error('Failed to send multiple battle notifications', [
                    'response' => $response->body()
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to send battle notifications',
                    'error' => $response->body()
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception sending multiple battle notifications', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to send battle notifications',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Send proximity alert notification
     */
    public function sendProximityAlert(string $expoPushToken, array $proximityData): array
    {
        try {
            $notification = [
                'to' => $expoPushToken,
                'title' => '📍 Players Nearby!',
                'body' => "There are {$proximityData['nearby_count']} players within battle range.",
                'data' => [
                    'type' => 'proximity_alert',
                    'nearby_count' => $proximityData['nearby_count'],
                    'can_battle' => $proximityData['can_battle'],
                    'is_safe_spot' => $proximityData['is_safe_spot']
                ],
                'sound' => 'default',
                'priority' => 'normal'
            ];

            $response = Http::post('https://exp.host/--/api/v2/push/send', [
                $notification
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Proximity alert sent successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to send proximity alert',
                    'error' => $response->body()
                ];
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to send proximity alert',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Send safe spot notification
     */
    public function sendSafeSpotNotification(string $expoPushToken, array $safeSpotData): array
    {
        try {
            $notification = [
                'to' => $expoPushToken,
                'title' => '🛡️ Safe Zone',
                'body' => "You're in a safe spot: {$safeSpotData['name']}. No battles allowed here.",
                'data' => [
                    'type' => 'safe_spot',
                    'safe_spot' => $safeSpotData
                ],
                'sound' => 'default',
                'priority' => 'low'
            ];

            $response = Http::post('https://exp.host/--/api/v2/push/send', [
                $notification
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Safe spot notification sent successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to send safe spot notification',
                    'error' => $response->body()
                ];
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to send safe spot notification',
                'error' => $e->getMessage()
            ];
        }
    }
}
