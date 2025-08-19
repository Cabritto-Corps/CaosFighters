import { Coordinates, SafeSpot, UserLocation } from '../../domain/entities/Location'
import { LocationRepository } from '../../domain/repositories/LocationRepository'
import { LocationService } from '../../domain/services/LocationService'

// Mock LocationRepository
const mockLocationRepository: jest.Mocked<LocationRepository> = {
    updateUserLocation: jest.fn(),
    getUserLocation: jest.fn(),
    removeUserLocation: jest.fn(),
    findUsersInRange: jest.fn(),
    findNearbyUsers: jest.fn(),
    saveLocationHistory: jest.fn(),
    getUserLocationHistory: jest.fn(),
    getSafeSpots: jest.fn(),
    findNearestSafeSpot: jest.fn(),
    isLocationInSafeSpot: jest.fn(),
    getActiveUsers: jest.fn(),
    setUserActive: jest.fn(),
}

describe('LocationService', () => {
    let locationService: LocationService

    beforeEach(() => {
        locationService = new LocationService(mockLocationRepository)
        jest.clearAllMocks()
    })

    const testCoordinates: Coordinates = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date()
    }

    const mockUserLocation: UserLocation = {
        userId: 'user1',
        coordinates: testCoordinates,
        isActive: true,
        lastUpdate: new Date()
    }

    const mockSafeSpot: SafeSpot = {
        id: 1,
        name: 'Central Park',
        latitude: 40.7829,
        longitude: -73.9654,
        createdAt: new Date()
    }

    describe('Update User Location', () => {
        it('should update user location successfully', async () => {
            mockLocationRepository.isLocationInSafeSpot.mockResolvedValue(false)
            mockLocationRepository.updateUserLocation.mockResolvedValue()
            mockLocationRepository.saveLocationHistory.mockResolvedValue()
            mockLocationRepository.setUserActive.mockResolvedValue()

            const result = await locationService.updateUserLocation('user1', 40.7128, -74.0060, 10)

            expect(result.success).toBe(true)
            expect(result.isInSafeSpot).toBe(false)
            expect(mockLocationRepository.updateUserLocation).toHaveBeenCalled()
            expect(mockLocationRepository.saveLocationHistory).toHaveBeenCalled()
            expect(mockLocationRepository.setUserActive).toHaveBeenCalledWith('user1', true)
        })

        it('should detect safe spot location', async () => {
            mockLocationRepository.isLocationInSafeSpot.mockResolvedValue(true)
            mockLocationRepository.updateUserLocation.mockResolvedValue()
            mockLocationRepository.saveLocationHistory.mockResolvedValue()
            mockLocationRepository.setUserActive.mockResolvedValue()

            const result = await locationService.updateUserLocation('user1', 40.7829, -73.9654)

            expect(result.success).toBe(true)
            expect(result.isInSafeSpot).toBe(true)
        })

        it('should handle invalid coordinates', async () => {
            const result = await locationService.updateUserLocation('user1', 91, -74.0060)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Latitude must be between -90 and 90 degrees')
        })
    })

    describe('Find Nearby Users', () => {
        it('should find nearby users successfully', async () => {
            const nearbyUsers = [
                { ...mockUserLocation, userId: 'user2' },
                { ...mockUserLocation, userId: 'user3' }
            ]

            mockLocationRepository.getUserLocation.mockResolvedValue(mockUserLocation)
            mockLocationRepository.isLocationInSafeSpot.mockResolvedValue(false)
            mockLocationRepository.findNearbyUsers.mockResolvedValue(nearbyUsers)

            const result = await locationService.findNearbyUsers('user1', 0.1)

            expect(result.success).toBe(true)
            expect(result.nearbyUsers).toEqual(nearbyUsers)
            expect(result.isInSafeSpot).toBe(false)
        })

        it('should return empty array when user not found', async () => {
            mockLocationRepository.getUserLocation.mockResolvedValue(null)

            const result = await locationService.findNearbyUsers('user1', 0.1)

            expect(result.success).toBe(false)
            expect(result.error).toContain('User location not found')
        })

        it('should return empty array when in safe spot', async () => {
            mockLocationRepository.getUserLocation.mockResolvedValue(mockUserLocation)
            mockLocationRepository.isLocationInSafeSpot.mockResolvedValue(true)

            const result = await locationService.findNearbyUsers('user1', 0.1)

            expect(result.success).toBe(true)
            expect(result.nearbyUsers).toEqual([])
            expect(result.isInSafeSpot).toBe(true)
        })

        it('should filter out users in safe spots', async () => {
            const nearbyUsers = [
                { ...mockUserLocation, userId: 'user2' },
                { ...mockUserLocation, userId: 'user3' }
            ]

            mockLocationRepository.getUserLocation.mockResolvedValue(mockUserLocation)
            mockLocationRepository.isLocationInSafeSpot
                .mockResolvedValueOnce(false) // User's location
                .mockResolvedValueOnce(false) // User2 location
                .mockResolvedValueOnce(true)  // User3 location (in safe spot)
            mockLocationRepository.findNearbyUsers.mockResolvedValue(nearbyUsers)

            const result = await locationService.findNearbyUsers('user1', 0.1)

            expect(result.success).toBe(true)
            expect(result.nearbyUsers).toHaveLength(1)
            expect(result.nearbyUsers?.[0]?.userId).toBe('user2')
        })
    })

    describe('Get User Location', () => {
        it('should get user location successfully', async () => {
            mockLocationRepository.getUserLocation.mockResolvedValue(mockUserLocation)

            const result = await locationService.getUserLocation('user1')

            expect(result.success).toBe(true)
            expect(result.location).toEqual(mockUserLocation)
        })

        it('should handle user location not found', async () => {
            mockLocationRepository.getUserLocation.mockResolvedValue(null)

            const result = await locationService.getUserLocation('user1')

            expect(result.success).toBe(false)
            expect(result.error).toContain('User location not found')
        })
    })

    describe('Safe Spots', () => {
        it('should get all safe spots', async () => {
            const safeSpots = [mockSafeSpot]
            mockLocationRepository.getSafeSpots.mockResolvedValue(safeSpots)

            const result = await locationService.getSafeSpots()

            expect(result.success).toBe(true)
            expect(result.safeSpots).toEqual(safeSpots)
        })

        it('should find nearest safe spot', async () => {
            mockLocationRepository.findNearestSafeSpot.mockResolvedValue(mockSafeSpot)

            const result = await locationService.findNearestSafeSpot(40.7128, -74.0060)

            expect(result.success).toBe(true)
            expect(result.safeSpots).toEqual([mockSafeSpot])
        })

        it('should handle no safe spots found', async () => {
            mockLocationRepository.findNearestSafeSpot.mockResolvedValue(null)

            const result = await locationService.findNearestSafeSpot(40.7128, -74.0060)

            expect(result.success).toBe(true)
            expect(result.safeSpots).toEqual([])
        })
    })

    describe('User Management', () => {
        it('should deactivate user successfully', async () => {
            mockLocationRepository.setUserActive.mockResolvedValue()
            mockLocationRepository.removeUserLocation.mockResolvedValue()

            const result = await locationService.deactivateUser('user1')

            expect(result.success).toBe(true)
            expect(mockLocationRepository.setUserActive).toHaveBeenCalledWith('user1', false)
            expect(mockLocationRepository.removeUserLocation).toHaveBeenCalledWith('user1')
        })

        it('should get location history', async () => {
            const history = [testCoordinates]
            mockLocationRepository.getUserLocationHistory.mockResolvedValue(history)

            const result = await locationService.getLocationHistory('user1', 10)

            expect(result.success).toBe(true)
            expect(result.locations).toBeDefined()
            expect(result.locations?.[0]?.userId).toBe('user1')
            expect(mockLocationRepository.getUserLocationHistory).toHaveBeenCalledWith('user1', 10)
        })
    })
})
