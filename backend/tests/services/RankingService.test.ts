import { UserProfile } from '../../domain/entities/User'
import { BattleRepository } from '../../domain/repositories/BattleRepository'
import { UserRepository } from '../../domain/repositories/UserRepository'
import { RankingService } from '../../domain/services/RankingService'

// Mock repositories
const mockUserRepository: jest.Mocked<UserRepository> = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    updateProfile: jest.fn(),
    deleteUser: jest.fn(),
    updatePoints: jest.fn(),
    updateRanking: jest.fn(),
    updateStatus: jest.fn(),
    getTopPlayers: jest.fn(),
    getUsersByStatus: jest.fn(),
}

const mockBattleRepository: jest.Mocked<BattleRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    startBattle: jest.fn(),
    endBattle: jest.fn(),
    cancelBattle: jest.fn(),
    findBattlesByPlayer: jest.fn(),
    findActiveBattlesByPlayer: jest.fn(),
    findCompletedBattlesByPlayer: jest.fn(),
    findBattlesByStatus: jest.fn(),
    findActiveBattles: jest.fn(),
    findPendingBattles: jest.fn(),
    getBattleHistory: jest.fn(),
    getBattleStatistics: jest.fn(),
    findAvailableBattles: jest.fn(),
    findBattlesByCharacter: jest.fn(),
}

describe('RankingService', () => {
    let rankingService: RankingService

    beforeEach(() => {
        rankingService = new RankingService(mockUserRepository, mockBattleRepository)
        jest.clearAllMocks()
    })

    const mockWinner: UserProfile = {
        id: 'winner-id',
        name: 'Winner',
        email: 'winner@example.com',
        points: 100,
        ranking: 5,
        status: 'active',
        createdAt: new Date()
    }

    const mockLoser: UserProfile = {
        id: 'loser-id',
        name: 'Loser',
        email: 'loser@example.com',
        points: 80,
        ranking: 8,
        status: 'active',
        createdAt: new Date()
    }

    describe('Award Battle Points', () => {
        it('should award points to winner and update rankings', async () => {
            const updatedWinner = { ...mockWinner, points: 120 }

            mockUserRepository.findById
                .mockResolvedValueOnce(mockWinner)
                .mockResolvedValueOnce(mockLoser)
            mockUserRepository.updatePoints
                .mockResolvedValueOnce(updatedWinner)
                .mockResolvedValueOnce({ ...mockLoser, points: 70 })
            mockUserRepository.getTopPlayers.mockResolvedValue([updatedWinner, mockLoser])

            const result = await rankingService.awardBattlePoints('winner-id', 'loser-id', 120000)

            expect(result.success).toBe(true)
            expect(result.user?.points).toBe(120)
            expect(result.pointsAwarded).toBeGreaterThan(0)
            expect(mockUserRepository.updatePoints).toHaveBeenCalledTimes(2)
        })

        it('should handle users not found', async () => {
            mockUserRepository.findById.mockResolvedValue(null)

            const result = await rankingService.awardBattlePoints('invalid-id', 'loser-id', 120000)

            expect(result.success).toBe(false)
            expect(result.error).toContain('One or both users not found')
        })

        it('should calculate upset bonus correctly', async () => {
            // Loser has more points than winner (upset victory)
            const strongLoser = { ...mockLoser, points: 200 }
            const weakWinner = { ...mockWinner, points: 50 }

            mockUserRepository.findById
                .mockResolvedValueOnce(weakWinner)
                .mockResolvedValueOnce(strongLoser)
            mockUserRepository.updatePoints.mockResolvedValue(weakWinner)
            mockUserRepository.getTopPlayers.mockResolvedValue([])

            const result = await rankingService.awardBattlePoints('winner-id', 'loser-id', 120000)

            expect(result.success).toBe(true)
            expect(result.pointsAwarded).toBeGreaterThan(10) // Should get upset bonus
        })

        it('should award speed bonus for quick battles', async () => {
            mockUserRepository.findById
                .mockResolvedValueOnce(mockWinner)
                .mockResolvedValueOnce(mockLoser)
            mockUserRepository.updatePoints.mockResolvedValue(mockWinner)
            mockUserRepository.getTopPlayers.mockResolvedValue([])

            // Very quick battle (under 1 minute)
            const result = await rankingService.awardBattlePoints('winner-id', 'loser-id', 45000)

            expect(result.success).toBe(true)
            expect(result.pointsAwarded).toBeGreaterThan(10) // Should get speed bonuses
        })

        it('should not allow negative points for loser', async () => {
            const lowPointsLoser = { ...mockLoser, points: 5 }

            mockUserRepository.findById
                .mockResolvedValueOnce(mockWinner)
                .mockResolvedValueOnce(lowPointsLoser)
            mockUserRepository.updatePoints
                .mockResolvedValueOnce(mockWinner)
                .mockResolvedValueOnce({ ...lowPointsLoser, points: 0 })
            mockUserRepository.getTopPlayers.mockResolvedValue([])

            const result = await rankingService.awardBattlePoints('winner-id', 'loser-id', 120000)

            expect(result.success).toBe(true)
            // Check that loser's points were updated to 0 (minimum)
            expect(mockUserRepository.updatePoints).toHaveBeenCalledWith('loser-id', 0)
        })
    })

    describe('Get Leaderboard', () => {
        it('should get leaderboard successfully', async () => {
            const topPlayers = [mockWinner, mockLoser]
            mockUserRepository.getTopPlayers.mockResolvedValue(topPlayers)

            const result = await rankingService.getLeaderboard(100)

            expect(result.success).toBe(true)
            expect(result.leaderboard).toEqual(topPlayers)
            expect(mockUserRepository.getTopPlayers).toHaveBeenCalledWith(100)
        })

        it('should use default limit', async () => {
            mockUserRepository.getTopPlayers.mockResolvedValue([])

            await rankingService.getLeaderboard()

            expect(mockUserRepository.getTopPlayers).toHaveBeenCalledWith(100)
        })
    })

    describe('Get User Ranking', () => {
        it('should get user ranking when set', async () => {
            mockUserRepository.findById.mockResolvedValue(mockWinner)

            const result = await rankingService.getUserRanking('winner-id')

            expect(result.success).toBe(true)
            expect(result.user).toEqual(mockWinner)
        })

        it('should calculate ranking when not set', async () => {
            const userWithoutRanking = { ...mockWinner, ranking: null }
            const userWithRanking = { ...mockWinner, ranking: 1 }

            mockUserRepository.findById
                .mockResolvedValueOnce(userWithoutRanking)
                .mockResolvedValueOnce(userWithRanking)
            mockUserRepository.getTopPlayers.mockResolvedValue([userWithRanking])

            const result = await rankingService.getUserRanking('winner-id')

            expect(result.success).toBe(true)
            expect(result.user?.ranking).toBe(1)
        })

        it('should handle user not found', async () => {
            mockUserRepository.findById.mockResolvedValue(null)

            const result = await rankingService.getUserRanking('invalid-id')

            expect(result.success).toBe(false)
            expect(result.error).toContain('User not found')
        })
    })

    describe('Update All Rankings', () => {
        it('should update rankings based on points', async () => {
            const users = [
                { ...mockWinner, points: 200, ranking: null },
                { ...mockLoser, points: 100, ranking: null }
            ]
            mockUserRepository.getTopPlayers.mockResolvedValue(users)
            mockUserRepository.updateRanking.mockResolvedValue(mockWinner)

            const result = await rankingService.updateAllRankings()

            expect(result.success).toBe(true)
            expect(mockUserRepository.updateRanking).toHaveBeenCalledWith('winner-id', 1)
            expect(mockUserRepository.updateRanking).toHaveBeenCalledWith('loser-id', 2)
        })

        it('should skip users with correct ranking', async () => {
            const users = [
                { ...mockWinner, points: 200, ranking: 1 },
                { ...mockLoser, points: 100, ranking: 2 }
            ]
            mockUserRepository.getTopPlayers.mockResolvedValue(users)

            const result = await rankingService.updateAllRankings()

            expect(result.success).toBe(true)
            expect(mockUserRepository.updateRanking).not.toHaveBeenCalled()
        })
    })

    describe('Get Battle Stats', () => {
        it('should get user battle statistics', async () => {
            const battleStats = {
                totalBattles: 10,
                wins: 7,
                losses: 3,
                winRate: 0.7,
                averageDuration: 120000
            }

            mockBattleRepository.getBattleStatistics.mockResolvedValue(battleStats)
            mockUserRepository.findById.mockResolvedValue(mockWinner)

            const result = await rankingService.getUserBattleStats('winner-id')

            expect(result.success).toBe(true)
            expect(result.user).toBeDefined()
            expect((result.user as any).battleStats).toEqual(battleStats)
        })

        it('should handle user not found for battle stats', async () => {
            mockUserRepository.findById.mockResolvedValue(null)

            const result = await rankingService.getUserBattleStats('invalid-id')

            expect(result.success).toBe(false)
            expect(result.error).toContain('User not found')
        })
    })

    describe('Seasonal Rewards', () => {
        it('should calculate seasonal rewards for top players', async () => {
            const topPlayers = [
                { ...mockWinner, points: 500 },
                { ...mockLoser, points: 300 }
            ]
            mockUserRepository.getTopPlayers.mockResolvedValue(topPlayers)
            mockUserRepository.updatePoints.mockResolvedValue(mockWinner)
            mockUserRepository.updateRanking.mockResolvedValue(mockWinner)

            const result = await rankingService.calculateSeasonalRewards()

            expect(result.success).toBe(true)
            expect(mockUserRepository.updatePoints).toHaveBeenCalledWith('winner-id', 550) // 500 + 50 bonus
            expect(mockUserRepository.updatePoints).toHaveBeenCalledWith('loser-id', 345) // 300 + 45 bonus
        })
    })
})
