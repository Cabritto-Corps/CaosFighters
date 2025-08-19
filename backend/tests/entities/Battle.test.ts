import { Battle, BattleParticipant } from '../../domain/entities/Battle'

describe('Battle Entity', () => {
    const player1: BattleParticipant = {
        userId: 'user1',
        characterId: 'char1',
        currentHp: 100,
        maxHp: 100,
        isAlive: true
    }

    const player2: BattleParticipant = {
        userId: 'user2',
        characterId: 'char2',
        currentHp: 100,
        maxHp: 100,
        isAlive: true
    }

    describe('Battle Creation', () => {
        it('should create a battle with valid players', () => {
            const battle = Battle.create('user1', 'user2', 'char1', 'char2')

            expect(battle.player1.userId).toBe('user1')
            expect(battle.player2.userId).toBe('user2')
            expect(battle.status).toBe('pending')
            expect(battle.winnerId).toBeNull()
            expect(battle.currentTurn).toBeNull()
            expect(battle.id).toBeDefined()
        })

        it('should not allow self-battles', () => {
            expect(() => Battle.create('user1', 'user1', 'char1', 'char2')).toThrow('Players cannot battle themselves')
        })

        it('should initialize participants with full HP', () => {
            const battle = Battle.create('user1', 'user2', 'char1', 'char2')

            expect(battle.player1.currentHp).toBe(100)
            expect(battle.player1.maxHp).toBe(100)
            expect(battle.player1.isAlive).toBe(true)

            expect(battle.player2.currentHp).toBe(100)
            expect(battle.player2.maxHp).toBe(100)
            expect(battle.player2.isAlive).toBe(true)
        })
    })

    describe('Battle State Management', () => {
        let battle: Battle

        beforeEach(() => {
            battle = Battle.create('user1', 'user2', 'char1', 'char2')
        })

        it('should start battle correctly', () => {
            battle.startBattle()

            expect(battle.status).toBe('active')
            expect(battle.currentTurn).toBe('user1')
            expect(battle.battleTimestamp).toBeDefined()
        })

        it('should not start non-pending battle', () => {
            battle.startBattle()
            expect(() => battle.startBattle()).toThrow('Battle can only be started when pending')
        })

        it('should end battle correctly', () => {
            battle.startBattle()
            const startTime = battle.battleTimestamp.getTime()

            // Simulate some time passing
            setTimeout(() => {
                battle.endBattle('user1')

                expect(battle.status).toBe('completed')
                expect(battle.winnerId).toBe('user1')
                expect(battle.currentTurn).toBeNull()
                expect(battle.duration).toBeGreaterThan(0)
            }, 10)
        })

        it('should not end non-active battle', () => {
            expect(() => battle.endBattle('user1')).toThrow('Battle can only be ended when active')
        })

        it('should not allow invalid winner', () => {
            battle.startBattle()
            expect(() => battle.endBattle('invalid-user')).toThrow('Winner must be one of the battle participants')
        })

        it('should cancel battle correctly', () => {
            battle.cancelBattle()
            expect(battle.status).toBe('cancelled')
            expect(battle.currentTurn).toBeNull()
        })

        it('should not cancel completed battle', () => {
            battle.startBattle()
            battle.endBattle('user1')
            expect(() => battle.cancelBattle()).toThrow('Cannot cancel a completed battle')
        })
    })

    describe('Turn Management', () => {
        let battle: Battle

        beforeEach(() => {
            battle = Battle.create('user1', 'user2', 'char1', 'char2')
            battle.startBattle()
        })

        it('should switch turns correctly', () => {
            expect(battle.currentTurn).toBe('user1')

            battle.switchTurn()
            expect(battle.currentTurn).toBe('user2')

            battle.switchTurn()
            expect(battle.currentTurn).toBe('user1')
        })

        it('should not switch turns in non-active battle', () => {
            battle.endBattle('user1')
            expect(() => battle.switchTurn()).toThrow('Can only switch turns during active battle')
        })
    })

    describe('Attack System', () => {
        let battle: Battle

        beforeEach(() => {
            battle = Battle.create('user1', 'user2', 'char1', 'char2')
            battle.startBattle()
        })

        it('should apply damage correctly', () => {
            battle.attack('user1', 'user2', 30)

            expect(battle.player2.currentHp).toBe(70)
            expect(battle.player2.isAlive).toBe(true)
            expect(battle.currentTurn).toBe('user2')
        })

        it('should end battle when player dies', () => {
            battle.attack('user1', 'user2', 100)

            expect(battle.player2.currentHp).toBe(0)
            expect(battle.player2.isAlive).toBe(false)
            expect(battle.status).toBe('completed')
            expect(battle.winnerId).toBe('user1')
        })

        it('should not allow attacks out of turn', () => {
            expect(() => battle.attack('user2', 'user1', 30)).toThrow('Not your turn to attack')
        })

        it('should not allow self-attacks', () => {
            expect(() => battle.attack('user1', 'user1', 30)).toThrow('Cannot attack yourself')
        })

        it('should not allow attacks in non-active battle', () => {
            battle.endBattle('user1')
            expect(() => battle.attack('user2', 'user1', 30)).toThrow('Can only attack during active battle')
        })

        it('should not allow attacks on invalid targets', () => {
            expect(() => battle.attack('user1', 'invalid-user', 30)).toThrow('Invalid target')
        })
    })

    describe('Participant Management', () => {
        let battle: Battle

        beforeEach(() => {
            battle = Battle.create('user1', 'user2', 'char1', 'char2')
        })

        it('should get participant correctly', () => {
            const participant1 = battle.getParticipant('user1')
            const participant2 = battle.getParticipant('user2')

            expect(participant1).toEqual(battle.player1)
            expect(participant2).toEqual(battle.player2)
            expect(battle.getParticipant('invalid')).toBeNull()
        })

        it('should check participation correctly', () => {
            expect(battle.isParticipant('user1')).toBe(true)
            expect(battle.isParticipant('user2')).toBe(true)
            expect(battle.isParticipant('user3')).toBe(false)
        })
    })

    describe('Battle Serialization', () => {
        it('should convert to JSON correctly', () => {
            const battle = Battle.create('user1', 'user2', 'char1', 'char2')
            battle.startBattle()

            const json = battle.toJSON()

            expect(json).toEqual({
                id: battle.id,
                player1: battle.player1,
                player2: battle.player2,
                winnerId: null,
                currentTurn: 'user1',
                status: 'active',
                duration: null,
                battleTimestamp: battle.battleTimestamp,
                createdAt: battle.createdAt
            })
        })
    })
})
