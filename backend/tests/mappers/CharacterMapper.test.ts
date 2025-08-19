import { CharacterMapper } from '../../infra/mappers/CharacterMapper'

describe('CharacterMapper', () => {
    let mapper: CharacterMapper

    beforeEach(() => {
        mapper = new CharacterMapper()
    })

    const mockDatabaseCharacter = {
        id: 'char-123',
        tier_id: 1,
        name: 'Warrior',
        agility: 50,
        strength: 60,
        hp: 80,
        defense: 40,
        speed: 70,
        created_at: '2024-01-01T00:00:00.000Z'
    }

    const mockDomainCharacter = {
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
        createdAt: new Date('2024-01-01T00:00:00.000Z')
    }

    describe('toDomain', () => {
        it('should map database character to domain character', () => {
            const result = mapper.toDomain(mockDatabaseCharacter)

            expect(result).toEqual(mockDomainCharacter)
            expect(result.createdAt).toBeInstanceOf(Date)
        })

        it('should handle different tier values', () => {
            const dbChar = { ...mockDatabaseCharacter, tier_id: 5 }
            const result = mapper.toDomain(dbChar)

            expect(result.tierId).toBe(5)
        })

        it('should preserve stats object structure', () => {
            const result = mapper.toDomain(mockDatabaseCharacter)

            expect(result.stats).toEqual({
                agility: 50,
                strength: 60,
                hp: 80,
                defense: 40,
                speed: 70
            })
            expect(typeof result.stats.agility).toBe('number')
            expect(typeof result.stats.strength).toBe('number')
            expect(typeof result.stats.hp).toBe('number')
            expect(typeof result.stats.defense).toBe('number')
            expect(typeof result.stats.speed).toBe('number')
        })
    })

    describe('toDatabase', () => {
        it('should map domain character to database character', () => {
            const result = mapper.toDatabase(mockDomainCharacter)

            expect(result).toEqual({
                id: 'char-123',
                tier_id: 1,
                name: 'Warrior',
                agility: 50,
                strength: 60,
                hp: 80,
                defense: 40,
                speed: 70
            })
        })

        it('should handle partial character updates', () => {
            const partialCharacter = {
                id: 'char-123',
                name: 'Updated Warrior',
                tierId: 2,
                stats: { agility: 75 }
            }

            const result = mapper.toDatabase(partialCharacter as any)

            expect(result.id).toBe('char-123')
            expect(result.name).toBe('Updated Warrior')
            expect(result.tier_id).toBe(2)
            expect(result.agility).toBe(75)
        })
    })

    describe('toDomainList', () => {
        it('should map array of database characters to domain characters', () => {
            const dbCharacters = [
                mockDatabaseCharacter,
                { ...mockDatabaseCharacter, id: 'char-456', name: 'Mage' }
            ]

            const result = mapper.toDomainList(dbCharacters)

            expect(result).toHaveLength(2)
            expect(result[0]?.id).toBe('char-123')
            expect(result[1]?.id).toBe('char-456')
            expect(result[1]?.name).toBe('Mage')
        })

        it('should handle empty array', () => {
            const result = mapper.toDomainList([])
            expect(result).toEqual([])
        })
    })
})
