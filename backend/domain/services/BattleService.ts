import { Attack, AttackResult, AttackType } from '../entities/Attack'
import { Battle, BattleState } from '../entities/Battle'
import { BattleRepository } from '../repositories/BattleRepository'
import { CharacterRepository } from '../repositories/CharacterRepository'
import { RankingService } from './RankingService'
import { RealtimeService } from './RealtimeService'

export interface BattleResult {
    success: boolean
    battle?: BattleState
    battles?: BattleState[]
    attackResult?: AttackResult
    attackOptions?: AttackType[]
    statistics?: {
        totalBattles: number
        wins: number
        losses: number
        winRate: number
        averageDuration: number
    }
    error?: string
}

export class BattleService {
    private battleRepository: BattleRepository
    private characterRepository: CharacterRepository
    private rankingService: RankingService | undefined
    private realtimeService: RealtimeService | undefined

    constructor(
        battleRepository: BattleRepository,
        characterRepository: CharacterRepository,
        rankingService?: RankingService,
        realtimeService?: RealtimeService
    ) {
        this.battleRepository = battleRepository
        this.characterRepository = characterRepository
        this.rankingService = rankingService
        this.realtimeService = realtimeService
    }

    async createBattle(player1Id: string, player2Id: string, character1Id: string, character2Id: string): Promise<BattleResult> {
        try {
            // Validate input
            if (player1Id === player2Id) {
                return {
                    success: false,
                    error: 'Players cannot battle themselves'
                }
            }

            // Verify characters exist
            const character1 = await this.characterRepository.findById(character1Id)
            const character2 = await this.characterRepository.findById(character2Id)

            if (!character1) {
                return {
                    success: false,
                    error: 'Character 1 not found'
                }
            }

            if (!character2) {
                return {
                    success: false,
                    error: 'Character 2 not found'
                }
            }

            // Check if players are already in active battles
            const player1ActiveBattles = await this.battleRepository.findActiveBattlesByPlayer(player1Id)
            const player2ActiveBattles = await this.battleRepository.findActiveBattlesByPlayer(player2Id)

            if (player1ActiveBattles.length > 0) {
                return {
                    success: false,
                    error: 'Player 1 is already in an active battle'
                }
            }

            if (player2ActiveBattles.length > 0) {
                return {
                    success: false,
                    error: 'Player 2 is already in an active battle'
                }
            }

            // Create battle
            const battle = Battle.create(player1Id, player2Id, character1Id, character2Id)
            const createdBattle = await this.battleRepository.create(battle)

            // Broadcast battle creation to both players
            if (this.realtimeService) {
                await this.realtimeService.broadcastBattleUpdate(createdBattle)
            }

            return {
                success: true,
                battle: createdBattle
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Battle creation failed'
            }
        }
    }

    async startBattle(battleId: string): Promise<BattleResult> {
        try {
            const battle = await this.battleRepository.findById(battleId)

            if (!battle) {
                return {
                    success: false,
                    error: 'Battle not found'
                }
            }

            if (battle.status !== 'pending') {
                return {
                    success: false,
                    error: 'Battle can only be started when pending'
                }
            }

            const startedBattle = await this.battleRepository.startBattle(battleId)

            // Broadcast battle start to both players
            if (this.realtimeService) {
                await this.realtimeService.broadcastBattleUpdate(startedBattle)
            }

            return {
                success: true,
                battle: startedBattle
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to start battle'
            }
        }
    }

    async performRandomAttack(battleId: string, attackerId: string): Promise<BattleResult> {
        try {
            const battle = await this.battleRepository.findById(battleId)

            if (!battle) {
                return {
                    success: false,
                    error: 'Battle not found'
                }
            }

            if (battle.status !== 'active') {
                return {
                    success: false,
                    error: 'Can only attack during active battle'
                }
            }

            if (battle.currentTurn !== attackerId) {
                return {
                    success: false,
                    error: 'Not your turn to attack'
                }
            }

            // Get attacker's character to generate random attack
            const attackerCharacter = battle.player1.userId === attackerId
                ? await this.characterRepository.findById(battle.player1.characterId)
                : await this.characterRepository.findById(battle.player2.characterId)

            if (!attackerCharacter) {
                return {
                    success: false,
                    error: 'Attacker character not found'
                }
            }

            // Generate random attack
            const attackResult = Attack.generateRandomAttack(attackerCharacter.stats)
            const damage = attackResult.damage

            // Determine target and apply damage
            const isPlayer1Attacker = battle.player1.userId === attackerId

            let updatedBattle: BattleState

            if (isPlayer1Attacker) {
                // Player 1 attacks Player 2
                const newHp = Math.max(0, battle.player2.currentHp - damage)
                const isAlive = newHp > 0

                updatedBattle = await this.battleRepository.update(battleId, {
                    player2: {
                        ...battle.player2,
                        currentHp: newHp,
                        isAlive
                    },
                    currentTurn: isAlive ? battle.player2.userId : null
                })

                // End battle if target dies
                if (!isAlive) {
                    updatedBattle = await this.battleRepository.endBattle(battleId, attackerId)

                    // Award points to winner
                    if (this.rankingService && updatedBattle.duration) {
                        await this.rankingService.awardBattlePoints(
                            attackerId,
                            battle.player2.userId,
                            updatedBattle.duration
                        )
                    }
                }
            } else {
                // Player 2 attacks Player 1
                const newHp = Math.max(0, battle.player1.currentHp - damage)
                const isAlive = newHp > 0

                updatedBattle = await this.battleRepository.update(battleId, {
                    player1: {
                        ...battle.player1,
                        currentHp: newHp,
                        isAlive
                    },
                    currentTurn: isAlive ? battle.player1.userId : null
                })

                // End battle if target dies
                if (!isAlive) {
                    updatedBattle = await this.battleRepository.endBattle(battleId, attackerId)

                    // Award points to winner
                    if (this.rankingService && updatedBattle.duration) {
                        await this.rankingService.awardBattlePoints(
                            attackerId,
                            battle.player2.userId,
                            updatedBattle.duration
                        )
                    }
                }
            }

            // Broadcast battle update to both players
            if (this.realtimeService) {
                await this.realtimeService.broadcastBattleUpdate(updatedBattle)
            }

            return {
                success: true,
                battle: updatedBattle,
                attackResult
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to perform attack'
            }
        }
    }

    async getBattle(battleId: string): Promise<BattleResult> {
        try {
            const battle = await this.battleRepository.findById(battleId)

            if (!battle) {
                return {
                    success: false,
                    error: 'Battle not found'
                }
            }

            return {
                success: true,
                battle
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get battle'
            }
        }
    }

    async getPlayerBattles(userId: string): Promise<BattleResult> {
        try {
            const battles = await this.battleRepository.findBattlesByPlayer(userId)

            return {
                success: true,
                battles
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get player battles'
            }
        }
    }

    async getActiveBattles(): Promise<BattleResult> {
        try {
            const battles = await this.battleRepository.findActiveBattles()

            return {
                success: true,
                battles
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get active battles'
            }
        }
    }

    async getBattleStatistics(userId: string): Promise<BattleResult> {
        try {
            const statistics = await this.battleRepository.getBattleStatistics(userId)

            return {
                success: true,
                statistics
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get battle statistics'
            }
        }
    }

    async cancelBattle(battleId: string, userId: string): Promise<BattleResult> {
        try {
            const battle = await this.battleRepository.findById(battleId)

            if (!battle) {
                return {
                    success: false,
                    error: 'Battle not found'
                }
            }

            // Check if user is a participant
            if (battle.player1.userId !== userId && battle.player2.userId !== userId) {
                return {
                    success: false,
                    error: 'Only battle participants can cancel the battle'
                }
            }

            if (battle.status === 'completed') {
                return {
                    success: false,
                    error: 'Cannot cancel a completed battle'
                }
            }

            const cancelledBattle = await this.battleRepository.cancelBattle(battleId)

            return {
                success: true,
                battle: cancelledBattle
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to cancel battle'
            }
        }
    }

    async joinBattle(battleId: string, player2Id: string, character2Id: string): Promise<BattleResult> {
        try {
            const battle = await this.battleRepository.findById(battleId)

            if (!battle) {
                return {
                    success: false,
                    error: 'Battle not found'
                }
            }

            if (battle.status !== 'pending') {
                return {
                    success: false,
                    error: 'Can only join pending battles'
                }
            }

            if (battle.player1.userId === player2Id) {
                return {
                    success: false,
                    error: 'Cannot join your own battle'
                }
            }

            // Verify character exists
            const character = await this.characterRepository.findById(character2Id)
            if (!character) {
                return {
                    success: false,
                    error: 'Character not found'
                }
            }

            // Update battle with second player
            const updatedBattle = await this.battleRepository.update(battleId, {
                player2: {
                    userId: player2Id,
                    characterId: character2Id,
                    currentHp: character.stats.hp,
                    maxHp: character.stats.hp,
                    isAlive: true
                }
            })

            return {
                success: true,
                battle: updatedBattle
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to join battle'
            }
        }
    }

    async getAttackOptions(battleId: string, attackerId: string): Promise<BattleResult> {
        try {
            const battle = await this.battleRepository.findById(battleId)

            if (!battle) {
                return {
                    success: false,
                    error: 'Battle not found'
                }
            }

            if (battle.status !== 'active') {
                return {
                    success: false,
                    error: 'Battle is not active'
                }
            }

            if (battle.currentTurn !== attackerId) {
                return {
                    success: false,
                    error: 'Not your turn'
                }
            }

            // Get attacker's character
            const attackerCharacter = battle.player1.userId === attackerId
                ? await this.characterRepository.findById(battle.player1.characterId)
                : await this.characterRepository.findById(battle.player2.characterId)

            if (!attackerCharacter) {
                return {
                    success: false,
                    error: 'Character not found'
                }
            }

            // Generate attack options
            const attackOptions = Attack.generateAttackOptions(attackerCharacter.stats, 3)

            return {
                success: true,
                attackOptions
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get attack options'
            }
        }
    }

    async performSpecificAttack(battleId: string, attackerId: string, attackId: string): Promise<BattleResult> {
        try {
            const battle = await this.battleRepository.findById(battleId)

            if (!battle) {
                return {
                    success: false,
                    error: 'Battle not found'
                }
            }

            if (battle.status !== 'active') {
                return {
                    success: false,
                    error: 'Can only attack during active battle'
                }
            }

            if (battle.currentTurn !== attackerId) {
                return {
                    success: false,
                    error: 'Not your turn to attack'
                }
            }

            // Get attacker's character
            const attackerCharacter = battle.player1.userId === attackerId
                ? await this.characterRepository.findById(battle.player1.characterId)
                : await this.characterRepository.findById(battle.player2.characterId)

            if (!attackerCharacter) {
                return {
                    success: false,
                    error: 'Attacker character not found'
                }
            }

            // Get the specific attack type
            const attackType = Attack.getAttackById(attackId)
            if (!attackType) {
                return {
                    success: false,
                    error: 'Invalid attack type'
                }
            }

            // Calculate damage for this specific attack
            const statValue = attackerCharacter.stats[attackType.statMultiplier]
            const statMultiplier = 1 + (statValue / 100)

            // Check for hit
            const hitRoll = Math.random() * 100
            const isHit = hitRoll <= attackType.accuracy

            let attackResult: AttackResult

            if (!isHit) {
                attackResult = {
                    attackId: attackType.id,
                    attackName: attackType.name,
                    damage: 0,
                    isCritical: false,
                    isHit: false,
                    message: `${attackType.name} missed!`
                }
            } else {
                let damage = Math.floor(attackType.baseDamage * statMultiplier)

                // Check for critical hit
                const critRoll = Math.random() * 100
                const isCritical = critRoll <= attackType.criticalChance

                if (isCritical) {
                    damage = Math.floor(damage * 1.5)
                }

                // Add randomness
                const randomMultiplier = 0.8 + (Math.random() * 0.4)
                damage = Math.floor(damage * randomMultiplier)
                damage = Math.max(1, damage)

                attackResult = {
                    attackId: attackType.id,
                    attackName: attackType.name,
                    damage,
                    isCritical,
                    isHit: true,
                    message: isCritical
                        ? `Critical ${attackType.name}! Dealt ${damage} damage!`
                        : `${attackType.name} hit for ${damage} damage!`
                }
            }

            // Apply damage if hit
            let updatedBattle: BattleState = battle

            if (attackResult.isHit && attackResult.damage > 0) {
                const isPlayer1Attacker = battle.player1.userId === attackerId

                if (isPlayer1Attacker) {
                    // Player 1 attacks Player 2
                    const newHp = Math.max(0, battle.player2.currentHp - attackResult.damage)
                    const isAlive = newHp > 0

                    updatedBattle = await this.battleRepository.update(battleId, {
                        player2: {
                            ...battle.player2,
                            currentHp: newHp,
                            isAlive
                        },
                        currentTurn: isAlive ? battle.player2.userId : null
                    })

                    // End battle if target dies
                    if (!isAlive) {
                        updatedBattle = await this.battleRepository.endBattle(battleId, attackerId)
                    }
                } else {
                    // Player 2 attacks Player 1
                    const newHp = Math.max(0, battle.player1.currentHp - attackResult.damage)
                    const isAlive = newHp > 0

                    updatedBattle = await this.battleRepository.update(battleId, {
                        player1: {
                            ...battle.player1,
                            currentHp: newHp,
                            isAlive
                        },
                        currentTurn: isAlive ? battle.player1.userId : null
                    })

                    // End battle if target dies
                    if (!isAlive) {
                        updatedBattle = await this.battleRepository.endBattle(battleId, attackerId)
                    }
                }
            } else {
                // Miss - just switch turns
                const isPlayer1Attacker = battle.player1.userId === attackerId
                const nextTurn = isPlayer1Attacker ? battle.player2.userId : battle.player1.userId

                updatedBattle = await this.battleRepository.update(battleId, {
                    currentTurn: nextTurn
                })
            }

            // Broadcast battle update to both players
            if (this.realtimeService) {
                await this.realtimeService.broadcastBattleUpdate(updatedBattle)
            }

            return {
                success: true,
                battle: updatedBattle,
                attackResult
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to perform specific attack'
            }
        }
    }
}
