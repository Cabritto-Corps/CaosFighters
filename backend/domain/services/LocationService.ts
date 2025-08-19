import { Coordinates, Location, SafeSpot, UserLocation } from '../entities/Location'
import { LocationRepository } from '../repositories/LocationRepository'

export interface LocationResult {
    success: boolean
    location?: UserLocation
    locations?: UserLocation[]
    safeSpots?: SafeSpot[]
    nearbyUsers?: UserLocation[]
    isInSafeSpot?: boolean
    error?: string
}

export class LocationService {
    private locationRepository: LocationRepository

    constructor(locationRepository: LocationRepository) {
        this.locationRepository = locationRepository
    }

    async updateUserLocation(userId: string, latitude: number, longitude: number, accuracy?: number): Promise<LocationResult> {
        try {
            // Validate coordinates
            const location = Location.create(latitude, longitude, accuracy)
            const coordinates = location.toJSON()

            // Check if user is in a safe spot
            const isInSafeSpot = await this.locationRepository.isLocationInSafeSpot(coordinates)

            // Update current location
            await this.locationRepository.updateUserLocation(userId, coordinates)

            // Save to location history
            await this.locationRepository.saveLocationHistory(userId, coordinates)

            // Set user as active
            await this.locationRepository.setUserActive(userId, true)

            return {
                success: true,
                isInSafeSpot
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update location'
            }
        }
    }

    async findNearbyUsers(userId: string, radiusKm: number = 0.1): Promise<LocationResult> {
        try {
            // Get user's current location
            const userLocation = await this.locationRepository.getUserLocation(userId)

            if (!userLocation) {
                return {
                    success: false,
                    error: 'User location not found'
                }
            }

            // Check if user is in a safe spot (can't battle in safe spots)
            const isInSafeSpot = await this.locationRepository.isLocationInSafeSpot(userLocation.coordinates)

            if (isInSafeSpot) {
                return {
                    success: true,
                    nearbyUsers: [], // Empty array - can't battle in safe spots
                    isInSafeSpot: true
                }
            }

            // Find nearby users (excluding users in safe spots)
            const nearbyUsers = await this.locationRepository.findNearbyUsers(userId, radiusKm)

            // Filter out users in safe spots
            const battleableUsers: UserLocation[] = []
            for (const user of nearbyUsers) {
                const userInSafeSpot = await this.locationRepository.isLocationInSafeSpot(user.coordinates)
                if (!userInSafeSpot) {
                    battleableUsers.push(user)
                }
            }

            return {
                success: true,
                nearbyUsers: battleableUsers,
                isInSafeSpot: false
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to find nearby users'
            }
        }
    }

    async getUserLocation(userId: string): Promise<LocationResult> {
        try {
            const location = await this.locationRepository.getUserLocation(userId)

            if (!location) {
                return {
                    success: false,
                    error: 'User location not found'
                }
            }

            return {
                success: true,
                location
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get user location'
            }
        }
    }

    async getSafeSpots(): Promise<LocationResult> {
        try {
            const safeSpots = await this.locationRepository.getSafeSpots()

            return {
                success: true,
                safeSpots
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get safe spots'
            }
        }
    }

    async findNearestSafeSpot(latitude: number, longitude: number): Promise<LocationResult> {
        try {
            const coordinates: Coordinates = {
                latitude,
                longitude,
                timestamp: new Date()
            }

            const nearestSafeSpot = await this.locationRepository.findNearestSafeSpot(coordinates)

            return {
                success: true,
                safeSpots: nearestSafeSpot ? [nearestSafeSpot] : []
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to find nearest safe spot'
            }
        }
    }

    async deactivateUser(userId: string): Promise<LocationResult> {
        try {
            await this.locationRepository.setUserActive(userId, false)
            await this.locationRepository.removeUserLocation(userId)

            return {
                success: true
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to deactivate user'
            }
        }
    }

    async getLocationHistory(userId: string, limit: number = 50): Promise<LocationResult> {
        try {
            const history = await this.locationRepository.getUserLocationHistory(userId, limit)

            return {
                success: true,
                locations: history.map(coord => ({
                    userId,
                    coordinates: coord,
                    isActive: false,
                    lastUpdate: coord.timestamp
                }))
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get location history'
            }
        }
    }
}
