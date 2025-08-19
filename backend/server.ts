import cors from 'cors'
import dotenv from 'dotenv'
import express, { NextFunction, Request, Response } from 'express'
import { AuthService } from './domain/services/AuthService'
import { BattleService } from './domain/services/BattleService'
import { CharacterService } from './domain/services/CharacterService'
import { LocationService } from './domain/services/LocationService'
import { MatchmakingService } from './domain/services/MatchmakingService'
import { RankingService } from './domain/services/RankingService'
import { RealtimeService } from './domain/services/RealtimeService'
import { InMemoryLocationGateway } from './infra/gateways/InMemoryLocationGateway'
import { SupabaseBattleGateway } from './infra/gateways/SupabaseBattleGateway'
import { SupabaseCharacterGateway } from './infra/gateways/SupabaseCharacterGateway'
import { SupabaseUserGateway } from './infra/gateways/SupabaseUserGateway'
import { AuthenticatedRequest, authenticateToken } from './middleware/auth'

// Carrega variáveis de ambiente
dotenv.config()

const app = express()
const PORT = process.env['PORT'] || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Initialize services
const userGateway = new SupabaseUserGateway()
const characterGateway = new SupabaseCharacterGateway()
const battleGateway = new SupabaseBattleGateway()
const locationGateway = new InMemoryLocationGateway()

// Core services
const authService = new AuthService(userGateway)
const characterService = new CharacterService(characterGateway)
const rankingService = new RankingService(userGateway, battleGateway)
const realtimeService = new RealtimeService()
const locationService = new LocationService(locationGateway)

// Enhanced battle service with ranking and real-time
const battleService = new BattleService(battleGateway, characterGateway, rankingService, realtimeService)

// Matchmaking service for proximity-based battles
const matchmakingService = new MatchmakingService(locationService, battleService, characterService)

// Health check route
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Battle Arena Backend is running'
    })
})

app.post('/auth/signup', async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, email, password'
            })
        }

        const result = await authService.signUp({ name, email, password })

        if (result.success) {
            return res.status(201).json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Signup error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/auth/signin', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: email, password'
            })
        }

        const result = await authService.signIn({ email, password })

        if (result.success) {
            return res.status(200).json(result)
        } else {
            return res.status(401).json(result)
        }
    } catch (error) {
        console.error('Signin error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/auth/signout', async (_req: Request, res: Response) => {
    try {
        const result = await authService.signOut()

        if (result.success) {
            return res.status(200).json(result)
        } else {
            return res.status(500).json(result)
        }
    } catch (error) {
        console.error('Signout error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// User routes - temporarily commented out
app.get('/users/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        const user = await userGateway.findById(id)

        if (user) {
            return res.json({ success: true, user })
        } else {
            return res.status(404).json({ success: false, error: 'User not found' })
        }
    } catch (error) {
        console.error('Get user error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/users/email/:email', async (req: Request, res: Response) => {
    try {
        const { email } = req.params

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            })
        }

        const user = await userGateway.findByEmail(email)

        if (user) {
            return res.json({ success: true, user })
        } else {
            return res.status(404).json({ success: false, error: 'User not found' })
        }
    } catch (error) {
        console.error('Get user by email error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/users/top/:limit', async (req: Request, res: Response) => {
    try {
        const { limit } = req.params

        if (!limit) {
            return res.status(400).json({
                success: false,
                error: 'Limit parameter is required'
            })
        }

        const limitNum = parseInt(limit) || 10

        if (limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                error: 'Limit must be between 1 and 100'
            })
        }

        const users = await userGateway.getTopPlayers(limitNum)
        return res.json({ success: true, users, count: users.length })
    } catch (error) {
        console.error('Get top users error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// Character routes
app.post('/characters', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { tierId, name, stats } = req.body

        if (!tierId || !name || !stats) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: tierId, name, stats'
            })
        }

        const result = await characterService.createCharacter(tierId, name, stats)

        if (result.success) {
            return res.status(201).json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Create character error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/characters/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Character ID is required'
            })
        }

        const result = await characterService.getCharacter(id)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(404).json(result)
        }
    } catch (error) {
        console.error('Get character error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/characters', async (_req: Request, res: Response) => {
    try {
        const result = await characterService.getAllCharacters()

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(500).json(result)
        }
    } catch (error) {
        console.error('Get all characters error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/characters/tier/:tierId', async (req: Request, res: Response) => {
    try {
        const { tierId } = req.params

        if (!tierId) {
            return res.status(400).json({
                success: false,
                error: 'Tier ID is required'
            })
        }

        const tierIdNum = parseInt(tierId)
        if (isNaN(tierIdNum)) {
            return res.status(400).json({
                success: false,
                error: 'Tier ID must be a valid number'
            })
        }

        const result = await characterService.getCharactersByTier(tierIdNum)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Get characters by tier error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.put('/characters/:id/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params
        const { stats } = req.body

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Character ID is required'
            })
        }

        if (!stats) {
            return res.status(400).json({
                success: false,
                error: 'Stats update is required'
            })
        }

        const result = await characterService.updateCharacterStats(id, stats)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Update character stats error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.put('/characters/:id/tier', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params
        const { tierId } = req.body

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Character ID is required'
            })
        }

        if (!tierId) {
            return res.status(400).json({
                success: false,
                error: 'Tier ID is required'
            })
        }

        const result = await characterService.upgradeCharacterTier(id, tierId)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Upgrade character tier error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.delete('/characters/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Character ID is required'
            })
        }

        const result = await characterService.deleteCharacter(id)

        if (result.success) {
            return res.status(204).send()
        } else {
            return res.status(404).json(result)
        }
    } catch (error) {
        console.error('Delete character error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/characters/search/power', async (req: Request, res: Response) => {
    try {
        const { minPower, maxPower } = req.query

        if (!minPower || !maxPower) {
            return res.status(400).json({
                success: false,
                error: 'minPower and maxPower query parameters are required'
            })
        }

        const minPowerNum = parseInt(minPower as string)
        const maxPowerNum = parseInt(maxPower as string)

        if (isNaN(minPowerNum) || isNaN(maxPowerNum)) {
            return res.status(400).json({
                success: false,
                error: 'Power values must be valid numbers'
            })
        }

        const result = await characterService.searchCharactersByPowerLevel(minPowerNum, maxPowerNum)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Search characters by power error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// Battle routes
app.post('/battles', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { player1Id, player2Id, character1Id, character2Id } = req.body

        if (!player1Id || !player2Id || !character1Id || !character2Id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: player1Id, player2Id, character1Id, character2Id'
            })
        }

        const result = await battleService.createBattle(player1Id, player2Id, character1Id, character2Id)

        if (result.success) {
            return res.status(201).json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Create battle error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/battles/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Battle ID is required'
            })
        }

        const result = await battleService.getBattle(id)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(404).json(result)
        }
    } catch (error) {
        console.error('Get battle error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/battles/:id/start', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Battle ID is required'
            })
        }

        const result = await battleService.startBattle(id)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Start battle error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/battles/:id/attack/random', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params
        const attackerId = req.user?.id

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Battle ID is required'
            })
        }

        if (!attackerId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            })
        }

        const result = await battleService.performRandomAttack(id, attackerId)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Random battle attack error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/battles/:id/attacks', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params
        const attackerId = req.user?.id

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Battle ID is required'
            })
        }

        if (!attackerId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            })
        }

        const result = await battleService.getAttackOptions(id, attackerId)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Get attack options error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/battles/:id/attack/:attackId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id, attackId } = req.params
        const attackerId = req.user?.id

        if (!id || !attackId) {
            return res.status(400).json({
                success: false,
                error: 'Battle ID and Attack ID are required'
            })
        }

        if (!attackerId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            })
        }

        const result = await battleService.performSpecificAttack(id, attackerId, attackId)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Specific battle attack error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/battles/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params
        const { userId } = req.body

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Battle ID is required'
            })
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        const result = await battleService.cancelBattle(id, userId)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Cancel battle error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/battles/player/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        const result = await battleService.getPlayerBattles(userId)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(500).json(result)
        }
    } catch (error) {
        console.error('Get player battles error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/battles/active', async (_req: Request, res: Response) => {
    try {
        const result = await battleService.getActiveBattles()

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(500).json(result)
        }
    } catch (error) {
        console.error('Get active battles error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/battles/stats/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        const result = await battleService.getBattleStatistics(userId)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(500).json(result)
        }
    } catch (error) {
        console.error('Get battle statistics error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// Ranking routes
app.get('/ranking/leaderboard', async (req: Request, res: Response) => {
    try {
        const { limit } = req.query
        const limitNum = limit ? parseInt(limit as string) : 100

        if (limitNum < 1 || limitNum > 500) {
            return res.status(400).json({
                success: false,
                error: 'Limit must be between 1 and 500'
            })
        }

        const result = await rankingService.getLeaderboard(limitNum)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(500).json(result)
        }
    } catch (error) {
        console.error('Get leaderboard error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/ranking/user/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        const result = await rankingService.getUserRanking(userId)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(404).json(result)
        }
    } catch (error) {
        console.error('Get user ranking error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/ranking/update', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await rankingService.updateAllRankings()

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(500).json(result)
        }
    } catch (error) {
        console.error('Update rankings error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// Real-time subscription routes
app.post('/realtime/subscribe/battle/:battleId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { battleId } = req.params

        if (!battleId) {
            return res.status(400).json({
                success: false,
                error: 'Battle ID is required'
            })
        }

        // In a real implementation, you would store subscription info
        // For now, we just return success to indicate the subscription endpoint exists
        return res.json({
            success: true,
            message: 'Battle subscription established',
            battleId,
            channelName: `battle:${battleId}`
        })
    } catch (error) {
        console.error('Subscribe to battle error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/realtime/subscribe/invitations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            })
        }

        // In a real implementation, you would store subscription info
        return res.json({
            success: true,
            message: 'Invitation subscription established',
            userId,
            channelName: `battle_invitations:${userId}`
        })
    } catch (error) {
        console.error('Subscribe to invitations error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// Location routes
app.post('/location/update', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { latitude, longitude, accuracy } = req.body
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            })
        }

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            })
        }

        const result = await locationService.updateUserLocation(userId, latitude, longitude, accuracy)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Update location error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/location/nearby', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { radius } = req.query
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            })
        }

        const radiusKm = radius ? parseFloat(radius as string) : 0.1
        const result = await locationService.findNearbyUsers(userId, radiusKm)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Find nearby users error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/location/safe-spots', async (_req: Request, res: Response) => {
    try {
        const result = await locationService.getSafeSpots()

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(500).json(result)
        }
    } catch (error) {
        console.error('Get safe spots error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// Matchmaking routes
app.get('/matchmaking/opponents', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { characterId, radius } = req.query
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            })
        }

        if (!characterId) {
            return res.status(400).json({
                success: false,
                error: 'Character ID is required'
            })
        }

        const radiusKm = radius ? parseFloat(radius as string) : 0.1
        const result = await matchmakingService.findNearbyOpponents(userId, characterId as string, radiusKm)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Find opponents error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/matchmaking/invite', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { toUserId, fromCharacterId, toCharacterId } = req.body
        const fromUserId = req.user?.id

        if (!fromUserId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            })
        }

        if (!toUserId || !fromCharacterId || !toCharacterId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: toUserId, fromCharacterId, toCharacterId'
            })
        }

        const result = await matchmakingService.sendBattleInvitation(fromUserId, toUserId, fromCharacterId, toCharacterId)

        if (result.success) {
            // Broadcast invitation via real-time
            if (result.invitation) {
                await realtimeService.broadcastBattleInvitation(result.invitation)
            }

            return res.status(201).json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Send invitation error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/matchmaking/respond/:invitationId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { invitationId } = req.params
        const { response } = req.body

        if (!invitationId) {
            return res.status(400).json({
                success: false,
                error: 'Invitation ID is required'
            })
        }

        if (!response || !['accepted', 'declined'].includes(response)) {
            return res.status(400).json({
                success: false,
                error: 'Response must be "accepted" or "declined"'
            })
        }

        const result = await matchmakingService.respondToInvitation(invitationId, response)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Respond to invitation error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/matchmaking/invitations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            })
        }

        const result = await matchmakingService.getUserInvitations(userId)

        if (result.success) {
            return res.json(result)
        } else {
            return res.status(500).json(result)
        }
    } catch (error) {
        console.error('Get user invitations error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// Available attacks route
app.get('/attacks/available', async (_req: Request, res: Response) => {
    try {
        const { Attack } = await import('./domain/entities/Attack')
        const availableAttacks = Attack.getAvailableAttacks()

        return res.json({
            success: true,
            attacks: availableAttacks
        })
    } catch (error) {
        console.error('Get available attacks error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// Development routes for data management
app.post('/dev/add-test-user', async (req: Request, res: Response) => {
    try {
        const { userId, latitude, longitude } = req.body

        if (!userId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, latitude, longitude'
            })
        }

        // Add test user to location gateway
        (locationGateway as any).addTestUser(userId, latitude, longitude)

        return res.json({
            success: true,
            message: 'Test user added',
            userId,
            location: { latitude, longitude }
        })
    } catch (error) {
        console.error('Add test user error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/dev/add-safe-spot', async (req: Request, res: Response) => {
    try {
        const { id, name, latitude, longitude } = req.body

        if (!id || !name || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: id, name, latitude, longitude'
            })
        }

        const safeSpot = {
            id,
            name,
            latitude,
            longitude,
            createdAt: new Date()
        };

        (locationGateway as any).addSafeSpot(safeSpot)

        return res.json({
            success: true,
            message: 'Safe spot added',
            safeSpot
        })
    } catch (error) {
        console.error('Add safe spot error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.delete('/dev/clear-data', async (_req: Request, res: Response) => {
    try {
        (locationGateway as any).clearAllData()

        return res.json({
            success: true,
            message: 'All location data cleared'
        })
    } catch (error) {
        console.error('Clear data error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/dev/all-users', async (_req: Request, res: Response) => {
    try {
        const users = (locationGateway as any).getAllUsers()

        return res.json({
            success: true,
            users,
            count: users.length
        })
    } catch (error) {
        console.error('Get all users error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// API documentation endpoint
app.get('/api/docs', (_req: Request, res: Response) => {
    res.json({
        title: 'Battle Arena API',
        version: '1.0.0',
        description: 'Proximity-based real-time battle system with Supabase real-time integration',
        endpoints: {
            auth: {
                'POST /auth/signup': 'Register new user',
                'POST /auth/signin': 'Sign in user',
                'POST /auth/signout': 'Sign out user'
            },
            users: {
                'GET /users/:id': 'Get user by ID',
                'GET /users/email/:email': 'Get user by email',
                'GET /users/top/:limit': 'Get top players'
            },
            characters: {
                'POST /characters': 'Create character (🔒)',
                'GET /characters': 'Get all characters',
                'GET /characters/:id': 'Get character by ID',
                'GET /characters/tier/:tierId': 'Get characters by tier',
                'PUT /characters/:id/stats': 'Update character stats (🔒)',
                'PUT /characters/:id/tier': 'Upgrade character tier (🔒)',
                'DELETE /characters/:id': 'Delete character (🔒)',
                'GET /characters/search/power': 'Search by power level'
            },
            battles: {
                'POST /battles': 'Create battle (🔒)',
                'GET /battles/:id': 'Get battle details',
                'POST /battles/:id/start': 'Start battle (🔒)',
                'POST /battles/:id/attack/random': 'Perform random attack (🔒)',
                'GET /battles/:id/attacks': 'Get attack options (🔒)',
                'POST /battles/:id/attack/:attackId': 'Perform specific attack (🔒)',
                'POST /battles/:id/cancel': 'Cancel battle (🔒)',
                'GET /battles/player/:userId': 'Get player battles',
                'GET /battles/active': 'Get active battles',
                'GET /battles/stats/:userId': 'Get battle statistics'
            },
            ranking: {
                'GET /ranking/leaderboard': 'Get leaderboard',
                'GET /ranking/user/:userId': 'Get user ranking',
                'POST /ranking/update': 'Update all rankings (🔒)'
            },
            location: {
                'POST /location/update': 'Update user location (🔒)',
                'GET /location/nearby': 'Find nearby users (🔒)',
                'GET /location/safe-spots': 'Get safe spots'
            },
            matchmaking: {
                'GET /matchmaking/opponents': 'Find nearby opponents (🔒)',
                'POST /matchmaking/invite': 'Send battle invitation (🔒)',
                'POST /matchmaking/respond/:invitationId': 'Respond to invitation (🔒)',
                'GET /matchmaking/invitations': 'Get user invitations (🔒)'
            },
            realtime: {
                'POST /realtime/subscribe/battle/:battleId': 'Subscribe to battle updates (🔒)',
                'POST /realtime/subscribe/invitations': 'Subscribe to invitations (🔒)'
            },
            attacks: {
                'GET /attacks/available': 'Get available attack types'
            },
            dev: {
                'POST /dev/add-test-user': 'Add test user location',
                'POST /dev/add-safe-spot': 'Add safe spot',
                'DELETE /dev/clear-data': 'Clear all location data',
                'GET /dev/all-users': 'Get all users for debugging'
            }
        },
        features: {
            'Proximity-based Matching': 'Users within 100m can battle',
            'Random Attack System': '5 different attack types with stats-based damage',
            'Automatic Point System': 'Points awarded based on opponent skill and battle duration',
            'Real-time Updates': 'Supabase real-time for live battles and notifications',
            'Safe Spots': 'Protected areas where battles cannot occur',
            'Ranking System': 'Dynamic leaderboards with tier progression'
        },
        notes: {
            '🔒': 'Protected route - requires authentication',
            'Real-time': 'Use Supabase client real-time subscriptions',
            'Location': 'In-memory storage for development - no mock data included',
            'Data': 'Use /dev/* routes to populate test data as needed'
        }
    })
})


// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err)
    return res.status(500).json({
        success: false,
        error: 'Internal server error'
    })
})

// 404 handler - catch all unmatched routes
app.use((_req: Request, res: Response) => {
    return res.status(404).json({
        success: false,
        error: 'Route not found'
    })
})

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Battle Arena Backend running on port ${PORT}`)
    console.log(`📊 Health check: http://localhost:${PORT}/health`)
    console.log(`🔐 Auth routes: http://localhost:${PORT}/auth/*`)
    console.log(`👥 User routes: http://localhost:${PORT}/users/*`)
    console.log(`⚔️  Character routes: http://localhost:${PORT}/characters/*`)
    console.log(`🥊 Battle routes: http://localhost:${PORT}/battles/*`)
    console.log(`🏆 Ranking routes: http://localhost:${PORT}/ranking/*`)
    console.log(`📍 Location routes: http://localhost:${PORT}/location/*`)
    console.log(`🎯 Matchmaking routes: http://localhost:${PORT}/matchmaking/*`)
    console.log(`⚡ Real-time routes: http://localhost:${PORT}/realtime/*`)
    console.log(`💥 Attack routes: http://localhost:${PORT}/attacks/*`)
    console.log('✅ All services initialized successfully!')
    console.log('🌍 Proximity-based battle system ready!')
    console.log('⚡ Supabase real-time enabled!')
})
