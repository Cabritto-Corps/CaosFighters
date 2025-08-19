import { BattleMapper } from '../../infra/mappers/BattleMapper'
import { BattleStatus } from '../../domain/entities/Battle'

describe('BattleMapper', () => {
    let mapper: BattleMapper

    beforeEach(() => {
        mapper = new BattleMapper()
    })

    const mockDatabaseBattle = {
        id: 'battle-123',
        player1_id: 'user1',
        player2_id: 'user2',
        character1_id: 'char1',
        character2_id: 'char2',
        player1_current_hp: 80,
        player1_max_hp: 100,
        player1_alive: true,
        player2_current_hp: 60,
        player2_max_hp: 100,
        player2_alive: true,
        winner_id: null,
        current_turn: 'user1',
        status: 'active' as BattleStatus,
        duration: null,
        battle_timestamp: '2024-01-01T10:00:00.000Z',
        created_at: '2024-01-01T09:00:00.000Z'
    }

    const mockDomainBattle = {
        id: 'battle-123',
        player1: {
            userId: 'user1',
            characterId: 'char1',
            currentHp: 80,
            maxHp: 100,
            isAlive: true
        },
        player2: {
            userId: 'user2',
            characterId: 'char2',
            currentHp: 60,
            maxHp: 100,
            isAlive: true
        },
        winnerId: null,
        currentTurn: 'user1',
        status: 'active' as BattleStatus,
        duration: null,
        battleTimestamp: new Date('2024-01-01T10:00:00.000Z'),
        createdAt: new Date('2024-01-01T09:00:00.000Z')
    }

    describe('toDomain', () => {
        it('should map database battle to domain battle', () => {
            const result = mapper.toDomain(mockDatabaseBattle)

            expect(result).toEqual(mockDomainBattle)
            expect(result.battleTimestamp).toBeInstanceOf(Date)
            expect(result.createdAt).toBeInstanceOf(Date)
        })

        it('should handle completed battle with winner', () => {
            const dbBattle = {
                ...mockDatabaseBattle,
                winner_id: 'user1',
                status: 'completed' as BattleStatus,
                duration: 120000,
                current_turn: null
            }

            const result = mapper.toDomain(dbBattle)

            expect(result.winnerId).toBe('user1')
            expect(result.status).toBe('completed')
            expect(result.duration).toBe(120000)
            expect(result.currentTurn).toBeNull()
        })

        it('should handle player death scenarios', () => {
            const dbBattle = {
                ...mockDatabaseBattle,
                player2_current_hp: 0,
                player2_alive: false,
                winner_id: 'user1',
                status: 'completed' as BattleStatus
            }

            const result = mapper.toDomain(dbBattle)

            expect(result.player2.currentHp).toBe(0)
            expect(result.player2.isAlive).toBe(false)
            expect(result.winnerId).toBe('user1')
            expect(result.status).toBe('completed')
        })

        it('should handle different battle statuses', () => {
            const statuses: BattleStatus[] = ['pending', 'active', 'completed', 'cancelled']
            
            statuses.forEach(status => {
                const dbBattle = { ...mockDatabaseBattle, status }
                const result = mapper.toDomain(dbBattle)
                expect(result.status).toBe(status)
            })
        })
    })

    describe('toDatabase', () => {
        it('should map domain battle to database battle', () => {
            const result = mapper.toDatabase(mockDomainBattle)

            expect(result).toEqual({
                id: 'battle-123',
                player1_id: 'user1',
                player2_id: 'user2',
                character1_id: 'char1',
                character2_id: 'char2',
                player1_current_hp: 80,
                player1_max_hp: 100,
                player1_alive: true,
                player2_current_hp: 60,
                player2_max_hp: 100,
                player2_alive: true,
                winner_id: null,
                current_turn: 'user1',
                status: 'active',
                duration: null,
                battle_timestamp: '2024-01-01T10:00:00.000Z'
            })
        })

        it('should handle partial battle updates', () => {
            const partialBattle = {
                id: 'battle-123',
                player1: {
                    userId: 'user1',
                    characterId: 'char1',
                    currentHp: 50,
                    maxHp: 100,
                    isAlive: true
                },
                currentTurn: 'user2'
            }

            const result = mapper.toDatabase(partialBattle as any)

            expect(result.id).toBe('battle-123')
            expect(result.player1_current_hp).toBe(50)
            expect(result.current_turn).toBe('user2')
        })

        it('should handle undefined values gracefully', () => {
            const battleWithUndefined = {
                ...mockDomainBattle,
                winnerId: undefined,
                duration: undefined
            }

            const result = mapper.toDatabase(battleWithUndefined as any)

            expect(result.winner_id).toBeUndefined()
            expect(result.duration).toBeUndefined()
        })
    })

    describe('toDomainList', () => {
        it('should map array of database battles to domain battles', () => {
            const dbBattles = [
                mockDatabaseBattle,
                { ...mockDatabaseBattle, id: 'battle-456' }
            ]

            const result = mapper.toDomainList(dbBattles)

            expect(result).toHaveLength(2)
            expect(result[0]?.id).toBe('battle-123')
            expect(result[1]?.id).toBe('battle-456')
        })

        it('should handle empty array', () => {
            const result = mapper.toDomainList([])
            expect(result).toEqual([])
        })
    })
})
