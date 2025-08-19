import { UserProfile } from '../entities/User'
import { BattleRepository } from '../repositories/BattleRepository'
import { UserRepository } from '../repositories/UserRepository'

export interface RankingResult {
    success: boolean
    user?: UserProfile
    leaderboard?: UserProfile[]
    pointsAwarded?: number
    newRanking?: number
    error?: string
}

export interface BattleReward {
    winnerId: string
    loserId: string
    pointsAwarded: number
    winnerNewRanking: number
    loserNewRanking: number
}

export class RankingService {
    private userRepository: UserRepository
    private battleRepository: BattleRepository

    constructor(userRepository: UserRepository, battleRepository: BattleRepository) {
        this.userRepository = userRepository
        this.battleRepository = battleRepository
    }

    async awardBattlePoints(winnerId: string, loserId: string, battleDuration: number): Promise<RankingResult> {
        try {
            // Get both users
            const winner = await this.userRepository.findById(winnerId)
            const loser = await this.userRepository.findById(loserId)

            if (!winner || !loser) {
                return {
                    success: false,
                    error: 'One or both users not found'
                }
            }

            // Calculate points based on battle duration and opponent skill
            const pointsAwarded = this.calculateBattlePoints(winner, loser, battleDuration)
            const pointsLost = Math.floor(pointsAwarded * 0.5) // Loser loses half the points winner gains

            // Update winner points
            const newWinnerPoints = winner.points + pointsAwarded
            const updatedWinner = await this.userRepository.updatePoints(winnerId, newWinnerPoints)

            // Update loser points (minimum 0)
            const newLoserPoints = Math.max(0, loser.points - pointsLost)
            await this.userRepository.updatePoints(loserId, newLoserPoints)

            // Update rankings after point changes
            await this.updateAllRankings()

            return {
                success: true,
                user: updatedWinner,
                pointsAwarded
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to award battle points'
            }
        }
    }

    private calculateBattlePoints(winner: UserProfile, loser: UserProfile, battleDuration: number): number {
        // Base points for winning
        let basePoints = 10

        // Bonus points for defeating higher-ranked opponent
        if (loser.points > winner.points) {
            const pointDifference = loser.points - winner.points
            const upsetBonus = Math.min(20, Math.floor(pointDifference / 10))
            basePoints += upsetBonus
        }

        // Quick battle bonus (battles under 2 minutes get bonus)
        if (battleDuration < 120000) { // 2 minutes in milliseconds
            basePoints += 5
        }

        // Efficiency bonus for very quick battles (under 1 minute)
        if (battleDuration < 60000) { // 1 minute in milliseconds
            basePoints += 5
        }

        return basePoints
    }

    async getLeaderboard(limit: number = 100): Promise<RankingResult> {
        try {
            const topPlayers = await this.userRepository.getTopPlayers(limit)

            return {
                success: true,
                leaderboard: topPlayers
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get leaderboard'
            }
        }
    }

    async getUserRanking(userId: string): Promise<RankingResult> {
        try {
            const user = await this.userRepository.findById(userId)

            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                }
            }

            // Calculate current ranking if not set
            if (user.ranking === null) {
                await this.updateAllRankings()
                const updatedUser = await this.userRepository.findById(userId)
                return {
                    success: true,
                    user: updatedUser || user
                }
            }

            return {
                success: true,
                user
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get user ranking'
            }
        }
    }

    async updateAllRankings(): Promise<RankingResult> {
        try {
            // Get all users ordered by points
            const allUsers = await this.userRepository.getTopPlayers(10000) // Large number to get all users

            // Update rankings based on points
            for (let i = 0; i < allUsers.length; i++) {
                const user = allUsers[i]
                if (!user) continue

                const newRanking = i + 1

                if (user.ranking !== newRanking) {
                    await this.userRepository.updateRanking(user.id, newRanking)
                }
            }

            return {
                success: true
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update rankings'
            }
        }
    }

    async getTierLeaderboard(_tier: number, limit: number = 50): Promise<RankingResult> {
        try {
            // This would require getting characters by tier and then their users
            // For now, we'll return the general leaderboard
            // TODO: Implement tier-specific leaderboards
            const leaderboard = await this.userRepository.getTopPlayers(limit)

            return {
                success: true,
                leaderboard
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get tier leaderboard'
            }
        }
    }

    async getUserBattleStats(userId: string): Promise<RankingResult> {
        try {
            const stats = await this.battleRepository.getBattleStatistics(userId)
            const user = await this.userRepository.findById(userId)

            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                }
            }

            return {
                success: true,
                user: {
                    ...user,
                    // Add battle stats to user profile
                    battleStats: stats
                } as any
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get user battle stats'
            }
        }
    }

    // Calculate seasonal rewards or ranking resets
    async calculateSeasonalRewards(): Promise<RankingResult> {
        try {
            // Get top players for seasonal rewards
            const topPlayers = await this.userRepository.getTopPlayers(10)

            // Award seasonal bonus points
            for (let i = 0; i < topPlayers.length; i++) {
                const player = topPlayers[i]
                if (!player) continue

                const seasonalBonus = Math.max(50 - i * 5, 10) // 50 points for #1, decreasing by 5

                const newPoints = player.points + seasonalBonus
                await this.userRepository.updatePoints(player.id, newPoints)
            }

            // Update rankings after seasonal rewards
            await this.updateAllRankings()

            return {
                success: true,
                leaderboard: topPlayers
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to calculate seasonal rewards'
            }
        }
    }
}
