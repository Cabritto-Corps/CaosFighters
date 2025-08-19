import { Coordinates, SafeSpot } from '../../domain/entities/Location'
import { InMemoryLocationGateway } from '../../infra/gateways/InMemoryLocationGateway'

describe('InMemoryLocationGateway', () => {
    let gateway: InMemoryLocationGateway

    beforeEach(() => {
        gateway = new InMemoryLocationGateway()
    })

    const testCoordinates: Coordinates = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date()
    }

    const testSafeSpot: SafeSpot = {
        id: 1,
        name: 'Test Safe Spot',
        latitude: 40.7829,
        longitude: -73.9654,
        createdAt: new Date()
    }

    describe('User Location Management', () => {
        it('should update user location', async () => {
            await gateway.updateUserLocation('user1', testCoordinates)

            const location = await gateway.getUserLocation('user1')
            expect(location).toBeDefined()
            expect(location?.userId).toBe('user1')
            expect(location?.coordinates).toEqual(testCoordinates)
            expect(location?.isActive).toBe(true)
        })

        it('should remove user location', async () => {
            await gateway.updateUserLocation('user1', testCoordinates)
            await gateway.removeUserLocation('user1')

            const location = await gateway.getUserLocation('user1')
            expect(location).toBeNull()
        })

        it('should return null for non-existent user', async () => {
            const location = await gateway.getUserLocation('non-existent')
            expect(location).toBeNull()
        })
    })

    describe('Proximity Queries', () => {
        beforeEach(async () => {
            // Add multiple users at different locations
            await gateway.updateUserLocation('user1', {
                latitude: 40.7128,
                longitude: -74.0060,
                timestamp: new Date()
            })

            await gateway.updateUserLocation('user2', {
                latitude: 40.7129, // Very close to user1
                longitude: -74.0061,
                timestamp: new Date()
            })

            await gateway.updateUserLocation('user3', {
                latitude: 40.8000, // Far from user1
                longitude: -74.1000,
                timestamp: new Date()
            })
        })

        it('should find users in range', async () => {
            const usersInRange = await gateway.findUsersInRange(testCoordinates, 0.1) // 100m

            expect(usersInRange.length).toBeGreaterThanOrEqual(1)
            expect(usersInRange.some(u => u.userId === 'user1')).toBe(true)
            expect(usersInRange.some(u => u.userId === 'user2')).toBe(true)
            expect(usersInRange.some(u => u.userId === 'user3')).toBe(false) // Too far
        })

        it('should find nearby users excluding requester', async () => {
            const nearbyUsers = await gateway.findNearbyUsers('user1', 0.1)

            expect(nearbyUsers.some(u => u.userId === 'user1')).toBe(false) // Excluded
            expect(nearbyUsers.some(u => u.userId === 'user2')).toBe(true)
            expect(nearbyUsers.some(u => u.userId === 'user3')).toBe(false) // Too far
        })

        it('should return empty array for user not found', async () => {
            const nearbyUsers = await gateway.findNearbyUsers('non-existent', 0.1)
            expect(nearbyUsers).toEqual([])
        })

        it('should exclude inactive users', async () => {
            await gateway.setUserActive('user2', false)

            const usersInRange = await gateway.findUsersInRange(testCoordinates, 0.1)
            const activeUsers = usersInRange.filter(u => u.isActive)

            expect(activeUsers.some(u => u.userId === 'user2')).toBe(false)
        })
    })

    describe('Location History', () => {
        it('should save and retrieve location history', async () => {
            const location1 = { ...testCoordinates, timestamp: new Date(Date.now() - 1000) }
            const location2 = { ...testCoordinates, latitude: 40.7130, timestamp: new Date() }

            await gateway.saveLocationHistory('user1', location1)
            await gateway.saveLocationHistory('user1', location2)

            const history = await gateway.getUserLocationHistory('user1', 10)

            expect(history).toHaveLength(2)
            expect(history[0]?.latitude).toBe(40.7130) // Most recent first
            expect(history[1]?.latitude).toBe(40.7128)
        })

        it('should limit location history', async () => {
            const history = await gateway.getUserLocationHistory('user1', 1)
            expect(history.length).toBeLessThanOrEqual(1)
        })

        it('should return empty array for user with no history', async () => {
            const history = await gateway.getUserLocationHistory('non-existent')
            expect(history).toEqual([])
        })
    })

    describe('Safe Spots Management', () => {
        it('should start with empty safe spots', async () => {
            const safeSpots = await gateway.getSafeSpots()
            expect(safeSpots).toEqual([])
        })

        it('should add and retrieve safe spots', async () => {
            gateway.addSafeSpot(testSafeSpot)

            const safeSpots = await gateway.getSafeSpots()
            expect(safeSpots).toHaveLength(1)
            expect(safeSpots[0]).toEqual(testSafeSpot)
        })

        it('should find nearest safe spot', async () => {
            gateway.addSafeSpot(testSafeSpot)

            const nearest = await gateway.findNearestSafeSpot(testCoordinates)
            expect(nearest).toEqual(testSafeSpot)
        })

        it('should return null when no safe spots exist', async () => {
            const nearest = await gateway.findNearestSafeSpot(testCoordinates)
            expect(nearest).toBeNull()
        })

        it('should detect location in safe spot', async () => {
            gateway.addSafeSpot(testSafeSpot)

            const nearSafeSpot = {
                latitude: 40.7829,
                longitude: -73.9654,
                timestamp: new Date()
            }

            const isInSafeSpot = await gateway.isLocationInSafeSpot(nearSafeSpot)
            expect(isInSafeSpot).toBe(true)
        })

        it('should detect location outside safe spot', async () => {
            gateway.addSafeSpot(testSafeSpot)

            const isInSafeSpot = await gateway.isLocationInSafeSpot(testCoordinates)
            expect(isInSafeSpot).toBe(false)
        })
    })

    describe('Active Users Management', () => {
        beforeEach(async () => {
            await gateway.updateUserLocation('user1', testCoordinates)
            await gateway.updateUserLocation('user2', {
                ...testCoordinates,
                latitude: 40.7130
            })
        })

        it('should get active users', async () => {
            const activeUsers = await gateway.getActiveUsers()

            expect(activeUsers).toHaveLength(2)
            expect(activeUsers.every(u => u.isActive)).toBe(true)
        })

        it('should set user active status', async () => {
            await gateway.setUserActive('user1', false)

            const location = await gateway.getUserLocation('user1')
            expect(location?.isActive).toBe(false)

            const activeUsers = await gateway.getActiveUsers()
            expect(activeUsers.some(u => u.userId === 'user1')).toBe(false)
        })

        it('should not affect non-existent users', async () => {
            await gateway.setUserActive('non-existent', false)
            // Should not throw error
        })
    })

    describe('Development Helpers', () => {
        it('should add test user', () => {
            gateway.addTestUser('test-user', 40.7128, -74.0060)

            const allUsers = gateway.getAllUsers()
            expect(allUsers.some(u => u.userId === 'test-user')).toBe(true)
        })

        it('should get all users for debugging', async () => {
            await gateway.updateUserLocation('user1', testCoordinates)
            gateway.addTestUser('test-user', 40.7130, -74.0070)

            const allUsers = gateway.getAllUsers()
            expect(allUsers).toHaveLength(2)
        })

        it('should clear all data', async () => {
            await gateway.updateUserLocation('user1', testCoordinates)
            gateway.addSafeSpot(testSafeSpot)
            await gateway.saveLocationHistory('user1', testCoordinates)

            gateway.clearAllData()

            const users = gateway.getAllUsers()
            const safeSpots = await gateway.getSafeSpots()
            const history = await gateway.getUserLocationHistory('user1')

            expect(users).toEqual([])
            expect(safeSpots).toEqual([])
            expect(history).toEqual([])
        })
    })
})
