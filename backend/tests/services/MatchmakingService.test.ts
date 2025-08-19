import { CharacterProfile } from '../../domain/entities/Character'
import { UserLocation } from '../../domain/entities/Location'
import { MatchmakingService } from '../../domain/services/MatchmakingService'

// Mock services
const mockLocationService = {
    findNearbyUsers: jest.fn(),
} as any

const mockBattleService = {
    createBattle: jest.fn(),
    startBattle: jest.fn(),
} as any

const mockCharacterService = {
    getCharacter: jest.fn(),
} as any

describe('MatchmakingService', () => {
    let matchmakingService: MatchmakingService

    beforeEach(() => {
        matchmakingService = new MatchmakingService(
            mockLocationService,
            mockBattleService,
            mockCharacterService
        )
        jest.clearAllMocks()
    })

    const mockCharacter: CharacterProfile = {
        id: 'char-123',
        tierId: 1,
        name: 'Warrior',
        stats: {
            agility: 50,
            strength: 60,
            hp: 80,
            defense: 40,
            speed: 70
        },
        createdAt: new Date()
    }

    const mockNearbyUsers: UserLocation[] = [
        {
            userId: 'user2',
            coordinates: {
                latitude: 40.7128,
                longitude: -74.0060,
                timestamp: new Date()
            },
            isActive: true,
            lastUpdate: new Date()
        },
        {
            userId: 'user3',
            coordinates: {
                latitude: 40.7129,
                longitude: -74.0061,
                timestamp: new Date()
            },
            isActive: true,
            lastUpdate: new Date()
        }
    ]

    describe('Find Nearby Opponents', () => {
        it('should find nearby opponents successfully', async () => {
            mockCharacterService.getCharacter.mockResolvedValue({
                success: true,
                character: mockCharacter
            })
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: mockNearbyUsers
            })

            const result = await matchmakingService.findNearbyOpponents('user1', 'char-123', 0.1)

            expect(result.success).toBe(true)
            expect(result.nearbyUsers).toEqual(mockNearbyUsers)
            expect(mockCharacterService.getCharacter).toHaveBeenCalledWith('char-123')
            expect(mockLocationService.findNearbyUsers).toHaveBeenCalledWith('user1', 0.1)
        })

        it('should handle character not found', async () => {
            mockCharacterService.getCharacter.mockResolvedValue({
                success: false,
                character: null
            })

            const result = await matchmakingService.findNearbyOpponents('user1', 'invalid-char', 0.1)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Character not found')
        })

        it('should handle no nearby users', async () => {
            mockCharacterService.getCharacter.mockResolvedValue({
                success: true,
                character: mockCharacter
            })
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: false,
                nearbyUsers: null
            })

            const result = await matchmakingService.findNearbyOpponents('user1', 'char-123', 0.1)

            expect(result.success).toBe(false)
            expect(result.error).toContain('No nearby users found')
        })
    })

    describe('Send Battle Invitation', () => {
        beforeEach(() => {
            // Mock time for consistent invitation expiration
            jest.spyOn(Date, 'now').mockReturnValue(1000000)
            jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
                // Don't actually wait, just return a timer ID
                return 123 as any
            })
        })

        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('should send invitation successfully', async () => {
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: mockNearbyUsers
            })

            const result = await matchmakingService.sendBattleInvitation(
                'user1', 'user2', 'char1', 'char2'
            )

            expect(result.success).toBe(true)
            expect(result.invitation).toBeDefined()
            expect(result.invitation?.fromUserId).toBe('user1')
            expect(result.invitation?.toUserId).toBe('user2')
            expect(result.invitation?.status).toBe('pending')
        })

        it('should reject if target user not nearby', async () => {
            const usersWithoutTarget = mockNearbyUsers.filter(u => u.userId !== 'user2')
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: usersWithoutTarget
            })

            const result = await matchmakingService.sendBattleInvitation(
                'user1', 'user2', 'char1', 'char2'
            )

            expect(result.success).toBe(false)
            expect(result.error).toContain('Target user is no longer in range')
        })

        it('should reject if users have pending invitations', async () => {
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: mockNearbyUsers
            })

            // Send first invitation
            await matchmakingService.sendBattleInvitation('user1', 'user2', 'char1', 'char2')

            // Try to send another invitation
            const result = await matchmakingService.sendBattleInvitation('user1', 'user3', 'char1', 'char3')

            expect(result.success).toBe(false)
            expect(result.error).toContain('A battle invitation is already pending')
        })
    })

    describe('Respond to Invitation', () => {
        it('should accept invitation and create battle', async () => {
            // First create an invitation
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: mockNearbyUsers
            })

            const inviteResult = await matchmakingService.sendBattleInvitation(
                'user1', 'user2', 'char1', 'char2'
            )

            // Mock battle creation
            const mockBattle = { id: 'battle-123', status: 'active' }
            mockBattleService.createBattle.mockResolvedValue({
                success: true,
                battle: mockBattle
            })
            mockBattleService.startBattle.mockResolvedValue({
                success: true,
                battle: mockBattle
            })

            const result = await matchmakingService.respondToInvitation(
                inviteResult.invitation!.id, 'accepted'
            )

            expect(result.success).toBe(true)
            expect(result.battle).toEqual(mockBattle)
            expect(mockBattleService.createBattle).toHaveBeenCalled()
        })

        it('should decline invitation successfully', async () => {
            // First create an invitation
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: mockNearbyUsers
            })

            const inviteResult = await matchmakingService.sendBattleInvitation(
                'user1', 'user2', 'char1', 'char2'
            )

            const result = await matchmakingService.respondToInvitation(
                inviteResult.invitation!.id, 'declined'
            )

            expect(result.success).toBe(true)
            expect(result.invitation?.status).toBe('declined')
            expect(mockBattleService.createBattle).not.toHaveBeenCalled()
        })

        it('should handle invitation not found', async () => {
            const result = await matchmakingService.respondToInvitation('invalid-id', 'accepted')

            expect(result.success).toBe(false)
            expect(result.error).toContain('Invitation not found or expired')
        })

        it('should handle expired invitations', async () => {
            // Create invitation
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: mockNearbyUsers
            })

            const inviteResult = await matchmakingService.sendBattleInvitation(
                'user1', 'user2', 'char1', 'char2'
            )

            // Mock time passing beyond expiration (31 seconds later)
            jest.spyOn(Date, 'now').mockReturnValue(1031000) // 31 seconds after initial time

            const result = await matchmakingService.respondToInvitation(
                inviteResult.invitation!.id, 'accepted'
            )

            expect(result.success).toBe(false)
            expect(result.error).toContain('Invitation has expired')
        })
    })

    describe('Get User Invitations', () => {
        it('should get user invitations', async () => {
            // Create invitation first
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: mockNearbyUsers
            })

            await matchmakingService.sendBattleInvitation('user1', 'user2', 'char1', 'char2')

            const result = await matchmakingService.getUserInvitations('user2')

            expect(result.success).toBe(true)
            expect(result.invitations).toHaveLength(1)
            expect(result.invitations?.[0]?.toUserId).toBe('user2')
        })

        it('should return empty array for no invitations', async () => {
            const result = await matchmakingService.getUserInvitations('user1')

            expect(result.success).toBe(true)
            expect(result.invitations).toEqual([])
        })
    })

    describe('Cancel Invitation', () => {
        it('should cancel invitation by sender', async () => {
            // Create invitation first
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: mockNearbyUsers
            })

            const inviteResult = await matchmakingService.sendBattleInvitation(
                'user1', 'user2', 'char1', 'char2'
            )

            const result = await matchmakingService.cancelInvitation(
                inviteResult.invitation!.id, 'user1'
            )

            expect(result.success).toBe(true)
            expect(result.invitation).toBeDefined()
        })

        it('should not allow cancel by non-sender', async () => {
            // Create invitation first
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: mockNearbyUsers
            })

            const inviteResult = await matchmakingService.sendBattleInvitation(
                'user1', 'user2', 'char1', 'char2'
            )

            const result = await matchmakingService.cancelInvitation(
                inviteResult.invitation!.id, 'user2'
            )

            expect(result.success).toBe(false)
            expect(result.error).toContain('Only the sender can cancel the invitation')
        })
    })

    describe('Auto Matchmaking', () => {
        it('should return nearby users for auto matchmaking', async () => {
            mockCharacterService.getCharacter.mockResolvedValue({
                success: true,
                character: mockCharacter
            })
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: mockNearbyUsers
            })

            const result = await matchmakingService.autoMatchmaking('user1', 'char-123')

            expect(result.success).toBe(true)
            expect(result.nearbyUsers).toEqual(mockNearbyUsers)
        })

        it('should handle no nearby users for auto matchmaking', async () => {
            mockCharacterService.getCharacter.mockResolvedValue({
                success: true,
                character: mockCharacter
            })
            mockLocationService.findNearbyUsers.mockResolvedValue({
                success: true,
                nearbyUsers: []
            })

            const result = await matchmakingService.autoMatchmaking('user1', 'char-123')

            expect(result.success).toBe(true)
            expect(result.nearbyUsers).toEqual([])
        })
    })
})
