import { Coordinates, SafeSpot, UserLocation } from '../entities/Location'

export interface LocationRepository {
    // User location management
    updateUserLocation(userId: string, location: Coordinates): Promise<void>
    getUserLocation(userId: string): Promise<UserLocation | null>
    removeUserLocation(userId: string): Promise<void>

    // Proximity queries
    findUsersInRange(centerLocation: Coordinates, radiusKm: number): Promise<UserLocation[]>
    findNearbyUsers(userId: string, radiusKm: number): Promise<UserLocation[]>

    // Location history
    saveLocationHistory(userId: string, location: Coordinates): Promise<void>
    getUserLocationHistory(userId: string, limit?: number): Promise<Coordinates[]>

    // Safe spots
    getSafeSpots(): Promise<SafeSpot[]>
    findNearestSafeSpot(location: Coordinates): Promise<SafeSpot | null>
    isLocationInSafeSpot(location: Coordinates): Promise<boolean>

    // Active users
    getActiveUsers(): Promise<UserLocation[]>
    setUserActive(userId: string, isActive: boolean): Promise<void>
}
