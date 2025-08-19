import { BattleState } from '../../domain/entities/Battle'
import { CharacterProfile } from '../../domain/entities/Character'
import { BattleRepository } from '../../domain/repositories/BattleRepository'
import { CharacterRepository } from '../../domain/repositories/CharacterRepository'
import { BattleService } from '../../domain/services/BattleService'
import { RankingService } from '../../domain/services/RankingService'
import { RealtimeService } from '../../domain/services/RealtimeService'

// Mock repositories and services
const mockBattleRepository: jest.Mocked<BattleRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    startBattle: jest.fn(),
    endBattle: jest.fn(),
    cancelBattle: jest.fn(),
    findByPlayer: jest.fn(),
    findActiveBattles: jest.fn(),
    findAvailableBattles: jest.fn(),
    getBattleHistory: jest.fn(),
    getBattleStatistics: jest.fn(),
}

const mockCharacterRepository: jest.Mocked<CharacterRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findByTier: jest.fn(),
    updateStats: jest.fn(),
    upgradeTier: jest.fn(),
    findByPowerRange: jest.fn(),
}

const mockRankingService: jest.Mocked<RankingService> = {
    awardBattlePoints: jest.fn(),
    getLeaderboard: jest.fn(),
    getUserRanking: jest.fn(),
    updateAllRankings: jest.fn(),
    getTierLeaderboard: jest.fn(),
    getUserBattleStats: jest.fn(),
    calculateSeasonalRewards: jest.fn(),
} as any

const mockRealtimeService: jest.Mocked<RealtimeService> = {
    subscribeToBattleInvitations: jest.fn(),
    subscribeToBattle: jest.fn(),
    subscribeToNearbyUsers: jest.fn(),
    broadcastBattleInvitation: jest.fn(),
    broadcastBattleUpdate: jest.fn(),
    broadcastNearbyUsers: jest.fn(),
    unsubscribe: jest.fn(),
    unsubscribeUser: jest.fn(),
    getActiveChannels: jest.fn(),
    hasActiveSubscriptions: jest.fn(),
}

describe('BattleService', () => {
    let battleService: BattleService

    beforeEach(() => {
        battleService = new BattleService(
            mockBattleRepository,
            mockCharacterRepository,
            mockRankingService,
            mockRealtimeService
        )
        jest.clearAllMocks()
    })

    const mockBattle: BattleState = {
        id: 'battle-123',
        player1: {
            userId: 'user1',
            characterId: 'char1',
            currentHp: 100,
            maxHp: 100,
            isAlive: true
        },
        player2: {
            userId: 'user2',
            characterId: 'char2',
            currentHp: 100,
            maxHp: 100,
            isAlive: true
        },
        winnerId: null,
        currentTurn: null,
        status: 'pending',
        duration: null,
        battleTimestamp: new Date(),
        createdAt: new Date()
    }

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

    describe('Create Battle', () => {
        it('should create battle with valid players', async () => {
            mockBattleRepository.findByPlayer.mockResolvedValue([])
            mockBattleRepository.create.mockResolvedValue(mockBattle)

            const result = await battleService.createBattle('user1', 'user2', 'char1', 'char2')

            expect(result.success).toBe(true)
            expect(result.battle).toEqual(mockBattle)
            expect(mockBattleRepository.create).toHaveBeenCalled()
            expect(mockRealtimeService.broadcastBattleUpdate).toHaveBeenCalledWith(mockBattle)
        })

        it('should reject self-battles', async () => {
            const result = await battleService.createBattle('user1', 'user1', 'char1', 'char2')

            expect(result.success).toBe(false)
            expect(result.error).toContain('Players cannot battle themselves')
            expect(mockBattleRepository.create).not.toHaveBeenCalled()
        })

        it('should reject if player already in battle', async () => {
            const activeBattle = { ...mockBattle, status: 'active' as const }
            mockBattleRepository.findByPlayer.mockResolvedValue([activeBattle])

            const result = await battleService.createBattle('user1', 'user2', 'char1', 'char2')

            expect(result.success).toBe(false)
            expect(result.error).toContain('Player 1 is already in an active battle')
        })
    })

    describe('Start Battle', () => {
        it('should start pending battle', async () => {
            const activeBattle = { ...mockBattle, status: 'active' as const, currentTurn: 'user1' }
            mockBattleRepository.findById.mockResolvedValue(mockBattle)
            mockBattleRepository.startBattle.mockResolvedValue(activeBattle)

            const result = await battleService.startBattle('battle-123')

            expect(result.success).toBe(true)
            expect(result.battle?.status).toBe('active')
            expect(mockBattleRepository.startBattle).toHaveBeenCalledWith('battle-123')
            expect(mockRealtimeService.broadcastBattleUpdate).toHaveBeenCalledWith(activeBattle)
        })

        it('should not start non-pending battle', async () => {
            const activeBattle = { ...mockBattle, status: 'active' as const }
            mockBattleRepository.findById.mockResolvedValue(activeBattle)

            const result = await battleService.startBattle('battle-123')

            expect(result.success).toBe(false)
            expect(result.error).toContain('Battle can only be started when pending')
            expect(mockBattleRepository.startBattle).not.toHaveBeenCalled()
        })

        it('should handle battle not found', async () => {
            mockBattleRepository.findById.mockResolvedValue(null)

            const result = await battleService.startBattle('invalid-id')

            expect(result.success).toBe(false)
            expect(result.error).toContain('Battle not found')
        })
    })

    describe('Random Attack', () => {
        it('should perform random attack', async () => {
            const activeBattle = {
                ...mockBattle,
                status: 'active' as const,
                currentTurn: 'user1'
            }
            const updatedBattle = {
                ...activeBattle,
                player2: { ...activeBattle.player2, currentHp: 80 }
            }

            mockBattleRepository.findById.mockResolvedValue(activeBattle)
            mockCharacterRepository.findById.mockResolvedValue(mockCharacter)
            mockBattleRepository.update.mockResolvedValue(updatedBattle)

            const result = await battleService.performRandomAttack('battle-123', 'user1')

            expect(result.success).toBe(true)
            expect(result.attackResult).toBeDefined()
            expect(mockCharacterRepository.findById).toHaveBeenCalled()
            expect(mockRealtimeService.broadcastBattleUpdate).toHaveBeenCalled()
        })

        it('should not allow attack out of turn', async () => {
            const activeBattle = {
                ...mockBattle,
                status: 'active' as const,
                currentTurn: 'user1'
            }
            mockBattleRepository.findById.mockResolvedValue(activeBattle)

            const result = await battleService.performRandomAttack('battle-123', 'user2')

            expect(result.success).toBe(false)
            expect(result.error).toContain('Not your turn to attack')
        })

        it('should not allow attack on non-active battle', async () => {
            mockBattleRepository.findById.mockResolvedValue(mockBattle) // status: 'pending'

            const result = await battleService.performRandomAttack('battle-123', 'user1')

            expect(result.success).toBe(false)
            expect(result.error).toContain('Battle is not active')
        })
    })

    describe('Cancel Battle', () => {
        it('should cancel battle successfully', async () => {
            const cancelledBattle = { ...mockBattle, status: 'cancelled' as const }
            mockBattleRepository.findById.mockResolvedValue(mockBattle)
            mockBattleRepository.cancelBattle.mockResolvedValue(cancelledBattle)

            const result = await battleService.cancelBattle('battle-123')

            expect(result.success).toBe(true)
            expect(result.battle?.status).toBe('cancelled')
            expect(mockBattleRepository.cancelBattle).toHaveBeenCalledWith('battle-123')
        })

        it('should handle battle not found', async () => {
            mockBattleRepository.findById.mockResolvedValue(null)

            const result = await battleService.cancelBattle('invalid-id')

            expect(result.success).toBe(false)
            expect(result.error).toContain('Battle not found')
        })
    })

    describe('Battle History', () => {
        it('should get player battles', async () => {
            const battles = [mockBattle]
            mockBattleRepository.findByPlayer.mockResolvedValue(battles)

            const result = await battleService.getPlayerBattles('user1')

            expect(result.success).toBe(true)
            expect(result.battles).toEqual(battles)
            expect(mockBattleRepository.findByPlayer).toHaveBeenCalledWith('user1')
        })

        it('should get battle statistics', async () => {
            const mockStats = {
                totalBattles: 10,
                wins: 7,
                losses: 3,
                winRate: 0.7,
                averageDuration: 120000
            }
            mockBattleRepository.getBattleStatistics.mockResolvedValue(mockStats)

            const result = await battleService.getBattleStatistics('user1')

            expect(result.success).toBe(true)
            expect(result.statistics).toEqual(mockStats)
            expect(mockBattleRepository.getBattleStatistics).toHaveBeenCalledWith('user1')
        })

        it('should get active battles', async () => {
            const activeBattles = [{ ...mockBattle, status: 'active' as const }]
            mockBattleRepository.findActiveBattles.mockResolvedValue(activeBattles)

            const result = await battleService.getActiveBattles()

            expect(result.success).toBe(true)
            expect(result.battles).toEqual(activeBattles)
            expect(mockBattleRepository.findActiveBattles).toHaveBeenCalled()
        })
    })

    describe('Attack Options', () => {
        it('should get attack options for battle participant', async () => {
            const activeBattle = {
                ...mockBattle,
                status: 'active' as const,
                currentTurn: 'user1'
            }
            mockBattleRepository.findById.mockResolvedValue(activeBattle)
            mockCharacterRepository.findById.mockResolvedValue(mockCharacter)

            const result = await battleService.getAttackOptions('battle-123', 'user1')

            expect(result.success).toBe(true)
            expect(result.attackOptions).toBeDefined()
            expect(result.attackOptions?.length).toBeGreaterThan(0)
        })

        it('should not get options for non-participant', async () => {
            const activeBattle = {
                ...mockBattle,
                status: 'active' as const,
                currentTurn: 'user1'
            }
            mockBattleRepository.findById.mockResolvedValue(activeBattle)

            const result = await battleService.getAttackOptions('battle-123', 'user3')

            expect(result.success).toBe(false)
            expect(result.error).toContain('User is not a participant in this battle')
        })
    })
})
