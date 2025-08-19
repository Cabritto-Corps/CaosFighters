import { Coordinates, Location, SafeSpot, UserLocation } from '../../domain/entities/Location'
import { LocationRepository } from '../../domain/repositories/LocationRepository'

export class InMemoryLocationGateway implements LocationRepository {
    private userLocations: Map<string, UserLocation> = new Map()
    private locationHistory: Map<string, Coordinates[]> = new Map()
    private safeSpots: SafeSpot[] = []

    async updateUserLocation(userId: string, location: Coordinates): Promise<void> {
        const userLocation: UserLocation = {
            userId,
            coordinates: location,
            isActive: true,
            lastUpdate: new Date()
        }

        this.userLocations.set(userId, userLocation)
    }

    async getUserLocation(userId: string): Promise<UserLocation | null> {
        return this.userLocations.get(userId) || null
    }

    async removeUserLocation(userId: string): Promise<void> {
        this.userLocations.delete(userId)
    }

    async findUsersInRange(centerLocation: Coordinates, radiusKm: number): Promise<UserLocation[]> {
        const usersInRange: UserLocation[] = []

        for (const userLocation of this.userLocations.values()) {
            if (!userLocation.isActive) continue

            const distance = Location.calculateDistance(
                centerLocation.latitude,
                centerLocation.longitude,
                userLocation.coordinates.latitude,
                userLocation.coordinates.longitude
            )

            if (distance <= radiusKm) {
                usersInRange.push(userLocation)
            }
        }

        return usersInRange
    }

    async findNearbyUsers(userId: string, radiusKm: number): Promise<UserLocation[]> {
        const userLocation = this.userLocations.get(userId)

        if (!userLocation) {
            return []
        }

        const nearbyUsers = await this.findUsersInRange(userLocation.coordinates, radiusKm)

        // Exclude the requesting user
        return nearbyUsers.filter(user => user.userId !== userId)
    }

    async saveLocationHistory(userId: string, location: Coordinates): Promise<void> {
        const history = this.locationHistory.get(userId) || []
        history.push(location)

        // Keep only last 1000 locations per user
        if (history.length > 1000) {
            history.splice(0, history.length - 1000)
        }

        this.locationHistory.set(userId, history)
    }

    async getUserLocationHistory(userId: string, limit: number = 50): Promise<Coordinates[]> {
        const history = this.locationHistory.get(userId) || []
        return history.slice(-limit).reverse() // Most recent first
    }

    async getSafeSpots(): Promise<SafeSpot[]> {
        return [...this.safeSpots]
    }

    async findNearestSafeSpot(location: Coordinates): Promise<SafeSpot | null> {
        let nearest: SafeSpot | null = null
        let shortestDistance = Infinity

        for (const safeSpot of this.safeSpots) {
            const distance = Location.calculateDistance(
                location.latitude,
                location.longitude,
                safeSpot.latitude,
                safeSpot.longitude
            )

            if (distance < shortestDistance) {
                shortestDistance = distance
                nearest = safeSpot
            }
        }

        return nearest
    }

    async isLocationInSafeSpot(location: Coordinates): Promise<boolean> {
        return Location.isInSafeSpot(location, this.safeSpots, 0.05) // 50 meters radius
    }

    async getActiveUsers(): Promise<UserLocation[]> {
        return Array.from(this.userLocations.values())
            .filter(user => user.isActive)
    }

    async setUserActive(userId: string, isActive: boolean): Promise<void> {
        const userLocation = this.userLocations.get(userId)

        if (userLocation) {
            userLocation.isActive = isActive
            userLocation.lastUpdate = new Date()
            this.userLocations.set(userId, userLocation)
        }
    }

    // Helper methods for development
    addTestUser(userId: string, latitude: number, longitude: number): void {
        const location: UserLocation = {
            userId,
            coordinates: {
                latitude,
                longitude,
                timestamp: new Date()
            },
            isActive: true,
            lastUpdate: new Date()
        }

        this.userLocations.set(userId, location)
    }

    addSafeSpot(safeSpot: SafeSpot): void {
        this.safeSpots.push(safeSpot)
    }

    // Get all users for debugging
    getAllUsers(): UserLocation[] {
        return Array.from(this.userLocations.values())
    }

    // Clear all data
    clearAllData(): void {
        this.userLocations.clear()
        this.locationHistory.clear()
        this.safeSpots.length = 0
    }
}
