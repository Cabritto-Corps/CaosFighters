import { Coordinates, Location, SafeSpot } from '../../domain/entities/Location'

describe('Location Entity', () => {
    describe('Location Creation', () => {
        it('should create a location with valid coordinates', () => {
            const location = Location.create(40.7128, -74.0060, 10)

            expect(location.latitude).toBe(40.7128)
            expect(location.longitude).toBe(-74.0060)
            expect(location.accuracy).toBe(10)
            expect(location.timestamp).toBeDefined()
        })

        it('should create location without accuracy', () => {
            const location = Location.create(40.7128, -74.0060)

            expect(location.accuracy).toBe(0)
        })

        it('should throw error for invalid latitude', () => {
            expect(() => Location.create(91, -74.0060)).toThrow('Latitude must be between -90 and 90 degrees')
            expect(() => Location.create(-91, -74.0060)).toThrow('Latitude must be between -90 and 90 degrees')
        })

        it('should throw error for invalid longitude', () => {
            expect(() => Location.create(40.7128, 181)).toThrow('Longitude must be between -180 and 180 degrees')
            expect(() => Location.create(40.7128, -181)).toThrow('Longitude must be between -180 and 180 degrees')
        })
    })

    describe('Distance Calculation', () => {
        it('should calculate distance between two points', () => {
            // New York to Los Angeles (approximately 3944 km)
            const nyToLa = Location.calculateDistance(40.7128, -74.0060, 34.0522, -118.2437)

            expect(nyToLa).toBeGreaterThan(3900)
            expect(nyToLa).toBeLessThan(4000)
        })

        it('should return 0 for same location', () => {
            const distance = Location.calculateDistance(40.7128, -74.0060, 40.7128, -74.0060)
            expect(distance).toBeCloseTo(0, 5)
        })

        it('should calculate short distances accurately', () => {
            // Two points about 100 meters apart in Manhattan
            const distance = Location.calculateDistance(40.7128, -74.0060, 40.7138, -74.0070)

            expect(distance).toBeLessThan(0.2) // Less than 200 meters
            expect(distance).toBeGreaterThan(0.05) // More than 50 meters
        })
    })

    describe('Battle Range Detection', () => {
        const location1: Coordinates = {
            latitude: 40.7128,
            longitude: -74.0060,
            timestamp: new Date()
        }

        it('should detect users within battle range', () => {
            // Very close location (within 100m)
            const closeLocation: Coordinates = {
                latitude: 40.7129,
                longitude: -74.0061,
                timestamp: new Date()
            }

            expect(Location.isWithinBattleRange(location1, closeLocation)).toBe(true)
        })

        it('should detect users outside battle range', () => {
            // Far location (more than 100m)
            const farLocation: Coordinates = {
                latitude: 40.7140,
                longitude: -74.0080,
                timestamp: new Date()
            }

            expect(Location.isWithinBattleRange(location1, farLocation)).toBe(false)
        })

        it('should respect custom battle range', () => {
            const location2: Coordinates = {
                latitude: 40.7135,
                longitude: -74.0070,
                timestamp: new Date()
            }

            expect(Location.isWithinBattleRange(location1, location2, 0.5)).toBe(true) // 500m range
            expect(Location.isWithinBattleRange(location1, location2, 0.05)).toBe(false) // 50m range
        })
    })

    describe('Safe Spot Detection', () => {
        const userLocation: Coordinates = {
            latitude: 40.7128,
            longitude: -74.0060,
            timestamp: new Date()
        }

        const safeSpots: SafeSpot[] = [
            {
                id: 1,
                name: 'Central Park',
                latitude: 40.7829,
                longitude: -73.9654,
                createdAt: new Date()
            },
            {
                id: 2,
                name: 'Times Square',
                latitude: 40.7580,
                longitude: -73.9855,
                createdAt: new Date()
            }
        ]

        it('should detect when not in safe spot', () => {
            expect(Location.isInSafeSpot(userLocation, safeSpots)).toBe(false)
        })

        it('should detect when in safe spot', () => {
            // Location very close to Central Park
            const nearPark: Coordinates = {
                latitude: 40.7830,
                longitude: -73.9655,
                timestamp: new Date()
            }

            expect(Location.isInSafeSpot(nearPark, safeSpots)).toBe(true)
        })

        it('should respect safe spot radius', () => {
            // Location slightly away from Central Park
            const location: Coordinates = {
                latitude: 40.7835, // A bit north of Central Park
                longitude: -73.9660, // A bit west of Central Park
                timestamp: new Date()
            }

            expect(Location.isInSafeSpot(location, safeSpots, 0.1)).toBe(true) // 100m radius - should be within
            expect(Location.isInSafeSpot(location, safeSpots, 0.01)).toBe(false) // 10m radius - should be outside
        })

        it('should handle empty safe spots array', () => {
            expect(Location.isInSafeSpot(userLocation, [])).toBe(false)
        })
    })

    describe('Location Serialization', () => {
        it('should convert to JSON correctly', () => {
            const location = Location.create(40.7128, -74.0060, 15)
            const json = location.toJSON()

            expect(json).toEqual({
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 15,
                timestamp: location.timestamp
            })
        })
    })
})
