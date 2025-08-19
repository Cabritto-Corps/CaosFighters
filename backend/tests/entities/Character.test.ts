import { Character, CharacterStats } from '../../domain/entities/Character'

describe('Character Entity', () => {
    const validStats: CharacterStats = {
        agility: 50,
        strength: 60,
        hp: 80,
        defense: 40,
        speed: 70
    }

    describe('Character Creation', () => {
        it('should create a character with valid data', () => {
            const character = Character.create(1, 'Warrior', validStats)

            expect(character.name).toBe('Warrior')
            expect(character.tierId).toBe(1)
            expect(character.stats).toEqual(validStats)
            expect(character.id).toBeDefined()
        })

        it('should throw error for invalid name', () => {
            expect(() => Character.create(1, 'A', validStats)).toThrow('Invalid name')
            expect(() => Character.create(1, '', validStats)).toThrow('Invalid name')
            expect(() => Character.create(1, 'A'.repeat(31), validStats)).toThrow('Invalid name')
        })

        it('should throw error for invalid stats', () => {
            const invalidStats = { ...validStats, agility: 101 }
            expect(() => Character.create(1, 'Warrior', invalidStats)).toThrow('Agility must be between 0 and 100')

            const negativeStats = { ...validStats, strength: -1 }
            expect(() => Character.create(1, 'Warrior', negativeStats)).toThrow('Strength must be between 0 and 100')
        })

        it('should trim whitespace from name', () => {
            const character = Character.create(1, '  Warrior  ', validStats)
            expect(character.name).toBe('Warrior')
        })
    })

    describe('Character Business Logic', () => {
        let character: Character

        beforeEach(() => {
            character = Character.create(1, 'Warrior', validStats)
        })

        it('should calculate power level correctly', () => {
            const expectedPower = 50 + 60 + 80 + 40 + 70 // 300
            expect(character.getPowerLevel()).toBe(expectedPower)
        })

        it('should update stats correctly', () => {
            character.updateStats({ agility: 75, strength: 85 })

            const updatedStats = character.stats
            expect(updatedStats.agility).toBe(75)
            expect(updatedStats.strength).toBe(85)
            expect(updatedStats.hp).toBe(80) // Unchanged
        })

        it('should not allow invalid stat updates', () => {
            expect(() => character.updateStats({ agility: 101 })).toThrow('Agility must be between 0 and 100')

            // Test HP validation separately since agility is checked first
            const newCharacter = Character.create(1, 'Test', validStats)
            expect(() => newCharacter.updateStats({ hp: -1 })).toThrow('HP must be between 0 and 100')
        })

        it('should upgrade tier correctly', () => {
            character.upgradeTier(2)
            expect(character.tierId).toBe(2)

            character.upgradeTier(3)
            expect(character.tierId).toBe(3)
        })

        it('should not allow downgrading tier', () => {
            character.upgradeTier(2)
            expect(() => character.upgradeTier(1)).toThrow('New tier must be higher than current tier')
            expect(() => character.upgradeTier(2)).toThrow('New tier must be higher than current tier')
        })

        it('should check if alive correctly', () => {
            expect(character.isAlive()).toBe(true)

            character.updateStats({ hp: 0 })
            expect(character.isAlive()).toBe(false)
        })

        it('should take damage correctly', () => {
            character.takeDamage(30)
            expect(character.stats.hp).toBe(50)

            character.takeDamage(60) // Should not go below 0
            expect(character.stats.hp).toBe(0)
        })

        it('should not allow negative damage', () => {
            expect(() => character.takeDamage(-10)).toThrow('Damage cannot be negative')
        })

        it('should heal correctly', () => {
            // Create fresh character with explicit stats to avoid test pollution
            const healTestStats: CharacterStats = {
                agility: 50,
                strength: 60,
                hp: 80,
                defense: 40,
                speed: 70
            }
            const freshCharacter = Character.create(1, 'TestHeal', healTestStats)
            expect(freshCharacter.stats.hp).toBe(80) // Initial HP

            freshCharacter.takeDamage(30) // HP becomes 50 (80 - 30)
            expect(freshCharacter.stats.hp).toBe(50)

            freshCharacter.heal(20)
            expect(freshCharacter.stats.hp).toBe(70) // 50 + 20 = 70

            freshCharacter.heal(50) // Should not go above max (100)
            expect(freshCharacter.stats.hp).toBe(100)
        })

        it('should not allow negative healing', () => {
            expect(() => character.heal(-10)).toThrow('Heal amount cannot be negative')
        })

        it('should convert to JSON correctly', () => {
            const json = character.toJSON()

            expect(json).toEqual({
                id: character.id,
                tierId: 1,
                name: 'Warrior',
                stats: validStats,
                createdAt: character.createdAt
            })
        })
    })

    describe('Character Validation', () => {
        it('should validate name correctly', () => {
            expect(Character.validateName('Wa')).toBe(true)
            expect(Character.validateName('Warrior King')).toBe(true)
            expect(Character.validateName('A'.repeat(30))).toBe(true)
            expect(Character.validateName('W')).toBe(false)
            expect(Character.validateName('')).toBe(false)
            expect(Character.validateName('A'.repeat(31))).toBe(false)
        })
    })
})
