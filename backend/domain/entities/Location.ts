export interface Coordinates {
    latitude: number
    longitude: number
    accuracy?: number
    timestamp: Date
}

export interface SafeSpot {
    id: number
    name: string
    latitude: number
    longitude: number
    createdAt: Date
}

export interface UserLocation {
    userId: string
    coordinates: Coordinates
    isActive: boolean
    lastUpdate: Date
}

export class Location {
    private _latitude: number
    private _longitude: number
    private _accuracy: number
    private _timestamp: Date

    constructor(latitude: number, longitude: number, accuracy: number = 0, timestamp: Date = new Date()) {
        this.validateCoordinates(latitude, longitude)
        this._latitude = latitude
        this._longitude = longitude
        this._accuracy = accuracy
        this._timestamp = timestamp
    }

    // Getters
    get latitude(): number { return this._latitude }
    get longitude(): number { return this._longitude }
    get accuracy(): number { return this._accuracy }
    get timestamp(): Date { return this._timestamp }

    // Calculate distance between two points using Haversine formula
    static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371 // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1)
        const dLon = this.toRadians(lon2 - lon1)

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

        return R * c // Distance in kilometers
    }

    // Check if two locations are within battle range (default 100 meters)
    static isWithinBattleRange(location1: Coordinates, location2: Coordinates, maxDistance: number = 0.1): boolean {
        const distance = this.calculateDistance(
            location1.latitude,
            location1.longitude,
            location2.latitude,
            location2.longitude
        )
        return distance <= maxDistance
    }

    // Check if location is in a safe spot (default 50 meters radius)
    static isInSafeSpot(userLocation: Coordinates, safeSpots: SafeSpot[], safeRadius: number = 0.05): boolean {
        return safeSpots.some(spot => {
            const distance = this.calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                spot.latitude,
                spot.longitude
            )
            return distance <= safeRadius
        })
    }

    private static toRadians(degrees: number): number {
        return degrees * (Math.PI / 180)
    }

    private validateCoordinates(latitude: number, longitude: number): void {
        if (latitude < -90 || latitude > 90) {
            throw new Error('Latitude must be between -90 and 90 degrees')
        }
        if (longitude < -180 || longitude > 180) {
            throw new Error('Longitude must be between -180 and 180 degrees')
        }
    }

    // Factory method
    static create(latitude: number, longitude: number, accuracy?: number): Location {
        return new Location(latitude, longitude, accuracy)
    }

    // Convert to plain object
    toJSON(): Coordinates {
        return {
            latitude: this._latitude,
            longitude: this._longitude,
            accuracy: this._accuracy,
            timestamp: this._timestamp
        }
    }
}
