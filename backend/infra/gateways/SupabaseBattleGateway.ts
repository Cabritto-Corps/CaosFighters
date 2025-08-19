import { Battle, BattleState, BattleStatus } from '../../domain/entities/Battle'
import { BattleRepository } from '../../domain/repositories/BattleRepository'
import { BattleMapper } from '../mappers/BattleMapper'
import { supabase } from '../supabase/client'

export class SupabaseBattleGateway implements BattleRepository {
    private battleMapper: BattleMapper

    constructor() {
        this.battleMapper = new BattleMapper()
    }

    async findById(id: string): Promise<BattleState | null> {
        try {
            const { data, error } = await supabase
                .from('battles')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return null // Battle not found
                }
                throw new Error(`Database error: ${error.message}`)
            }

            return this.battleMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Find battle failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async create(battle: Battle): Promise<BattleState> {
        try {
            const battleData = this.battleMapper.toDatabase(battle.toJSON())

            const { data, error } = await supabase
                .from('battles')
                .insert(battleData)
                .select()
                .single()

            if (error) {
                throw new Error(`Battle creation failed: ${error.message}`)
            }

            return this.battleMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Create battle failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async update(id: string, updates: Partial<BattleState>): Promise<BattleState> {
        try {
            const updateData = this.battleMapper.toDatabase(updates)

            const { data, error } = await supabase
                .from('battles')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`Update failed: ${error.message}`)
            }

            return this.battleMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Update battle failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async delete(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('battles')
                .delete()
                .eq('id', id)

            if (error) {
                throw new Error(`Delete failed: ${error.message}`)
            }
        } catch (error) {
            throw new Error(`Delete battle failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async startBattle(id: string): Promise<BattleState> {
        try {
            const { data, error } = await supabase
                .from('battles')
                .update({
                    status: 'active',
                    battle_timestamp: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`Start battle failed: ${error.message}`)
            }

            return this.battleMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Start battle failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async endBattle(id: string, winnerId: string): Promise<BattleState> {
        try {
            const currentBattle = await this.findById(id)
            if (!currentBattle) {
                throw new Error('Battle not found')
            }

            const duration = Date.now() - currentBattle.battleTimestamp.getTime()

            const { data, error } = await supabase
                .from('battles')
                .update({
                    status: 'completed',
                    winner_id: winnerId,
                    duration: duration,
                    current_turn: null
                })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`End battle failed: ${error.message}`)
            }

            return this.battleMapper.toDomain(data)
        } catch (error) {
            throw new Error(`End battle failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async cancelBattle(id: string): Promise<BattleState> {
        try {
            const { data, error } = await supabase
                .from('battles')
                .update({
                    status: 'cancelled',
                    current_turn: null
                })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`Cancel battle failed: ${error.message}`)
            }

            return this.battleMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Cancel battle failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findBattlesByPlayer(userId: string): Promise<BattleState[]> {
        try {
            const { data, error } = await supabase
                .from('battles')
                .select('*')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .order('created_at', { ascending: false })

            if (error) {
                throw new Error(`Get battles by player failed: ${error.message}`)
            }

            return data.map(battle => this.battleMapper.toDomain(battle))
        } catch (error) {
            throw new Error(`Find battles by player failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findActiveBattlesByPlayer(userId: string): Promise<BattleState[]> {
        try {
            const { data, error } = await supabase
                .from('battles')
                .select('*')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .eq('status', 'active')
                .order('created_at', { ascending: false })

            if (error) {
                throw new Error(`Get active battles by player failed: ${error.message}`)
            }

            return data.map(battle => this.battleMapper.toDomain(battle))
        } catch (error) {
            throw new Error(`Find active battles by player failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findCompletedBattlesByPlayer(userId: string): Promise<BattleState[]> {
        try {
            const { data, error } = await supabase
                .from('battles')
                .select('*')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })

            if (error) {
                throw new Error(`Get completed battles by player failed: ${error.message}`)
            }

            return data.map(battle => this.battleMapper.toDomain(battle))
        } catch (error) {
            throw new Error(`Find completed battles by player failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findBattlesByStatus(status: BattleStatus): Promise<BattleState[]> {
        try {
            const { data, error } = await supabase
                .from('battles')
                .select('*')
                .eq('status', status)
                .order('created_at', { ascending: false })

            if (error) {
                throw new Error(`Get battles by status failed: ${error.message}`)
            }

            return data.map(battle => this.battleMapper.toDomain(battle))
        } catch (error) {
            throw new Error(`Find battles by status failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findActiveBattles(): Promise<BattleState[]> {
        return this.findBattlesByStatus('active')
    }

    async findPendingBattles(): Promise<BattleState[]> {
        return this.findBattlesByStatus('pending')
    }

    async getBattleHistory(userId: string, limit: number = 50): Promise<BattleState[]> {
        try {
            const { data, error } = await supabase
                .from('battles')
                .select('*')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) {
                throw new Error(`Get battle history failed: ${error.message}`)
            }

            return data.map(battle => this.battleMapper.toDomain(battle))
        } catch (error) {
            throw new Error(`Get battle history failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async getBattleStatistics(userId: string): Promise<{
        totalBattles: number
        wins: number
        losses: number
        winRate: number
        averageDuration: number
    }> {
        try {
            // Get total battles and wins
            const { data: totalData, error: totalError } = await supabase
                .from('battles')
                .select('id, winner_id, duration')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .eq('status', 'completed')

            if (totalError) {
                throw new Error(`Get battle statistics failed: ${totalError.message}`)
            }

            const totalBattles = totalData.length
            const wins = totalData.filter(battle => battle.winner_id === userId).length
            const losses = totalBattles - wins
            const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0

            // Calculate average duration
            const battlesWithDuration = totalData.filter(battle => battle.duration !== null)
            const averageDuration = battlesWithDuration.length > 0
                ? battlesWithDuration.reduce((sum, battle) => sum + (battle.duration || 0), 0) / battlesWithDuration.length
                : 0

            return {
                totalBattles,
                wins,
                losses,
                winRate,
                averageDuration
            }
        } catch (error) {
            throw new Error(`Get battle statistics failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findAvailableBattles(userId: string, characterId: string): Promise<BattleState[]> {
        try {
            // Find battles where the user is not already participating and status is pending
            // We could add character tier matching logic here in the future
            const { data, error } = await supabase
                .from('battles')
                .select('*')
                .neq('player1_id', userId)
                .neq('player2_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: true })

            if (error) {
                throw new Error(`Get available battles failed: ${error.message}`)
            }

            // Future enhancement: filter by character tier compatibility
            console.log(`Finding available battles for character ${characterId}`)
            // TODO: Add character tier matching logic

            return data.map(battle => this.battleMapper.toDomain(battle))
        } catch (error) {
            throw new Error(`Find available battles failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findBattlesByCharacter(characterId: string): Promise<BattleState[]> {
        try {
            const { data, error } = await supabase
                .from('battles')
                .select('*')
                .or(`character1_id.eq.${characterId},character2_id.eq.${characterId}`)
                .order('created_at', { ascending: false })

            if (error) {
                throw new Error(`Get battles by character failed: ${error.message}`)
            }

            return data.map(battle => this.battleMapper.toDomain(battle))
        } catch (error) {
            throw new Error(`Find battles by character failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}
