/**
 * Proximity Notification Service
 * Handles location tracking and proximity-based notifications
 */

import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { apiService } from './api'

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
})

class ProximityNotificationService {
    private locationSubscription: Location.LocationSubscription | null = null
    private isTracking: boolean = false
    private watchPositionOptions: Location.LocationOptions = {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 50, // Update every 50 meters
    }

    /**
     * Request permissions for notifications and location
     */
    async requestPermissions(): Promise<{
        notifications: boolean
        location: boolean
    }> {
        // Request notification permissions
        const { status: notificationStatus } = await Notifications.requestPermissionsAsync()
        const notificationsGranted = notificationStatus === 'granted'

        // Request location permissions
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync()
        const locationGranted = locationStatus === 'granted'

        return {
            notifications: notificationsGranted,
            location: locationGranted,
        }
    }

    /**
     * Register Expo push token with backend
     */
    async registerPushToken(userId: string): Promise<string | null> {
        try {
            if (Constants.appOwnership === 'expo') {
                console.warn(
                    '[ProximityNotificationService] Expo Go não suporta envio de notificações push. Gere um build de desenvolvimento.'
                )
                return null
            }

            const token = await Notifications.getExpoPushTokenAsync({
                projectId: 'cbac2687-3963-46be-a056-e51daa716f74', // From app.json
            })

            // Update push token on backend
            await apiService.updatePushToken(token.data)

            return token.data
        } catch (error) {
            console.error('Failed to register push token:', error)
            return null
        }
    }

    /**
     * Start tracking location and sending updates
     */
    async startTracking(userId: string): Promise<boolean> {
        if (this.isTracking) {
            console.warn('Location tracking is already active')
            return true
        }

        try {
            // Request permissions
            const permissions = await this.requestPermissions()
            if (!permissions.location) {
                console.error('Location permission not granted')
                return false
            }

            // Register push token if notifications are enabled
            if (permissions.notifications) {
                await this.registerPushToken(userId)
            }

            // Start watching position
            this.locationSubscription = await Location.watchPositionAsync(
                this.watchPositionOptions,
                async (location) => {
                    try {
                        await apiService.updateLocation(
                            userId,
                            location.coords.latitude,
                            location.coords.longitude
                        )
                    } catch (error) {
                        console.error('Failed to update location:', error)
                    }
                }
            )

            this.isTracking = true
            return true
        } catch (error) {
            console.error('Failed to start location tracking:', error)
            return false
        }
    }

    /**
     * Stop tracking location
     */
    stopTracking(): void {
        if (this.locationSubscription) {
            this.locationSubscription.remove()
            this.locationSubscription = null
        }
        this.isTracking = false
    }

    /**
     * Check if currently tracking
     */
    isCurrentlyTracking(): boolean {
        return this.isTracking
    }

    /**
     * Get current location once
     */
    async getCurrentLocation(): Promise<{
        latitude: number
        longitude: number
    } | null> {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                return null
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            })

            return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            }
        } catch (error) {
            console.error('Failed to get current location:', error)
            return null
        }
    }
}

// Export singleton instance
export const proximityNotificationService = new ProximityNotificationService()

