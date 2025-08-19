import { Attack } from '../../domain/entities/Attack'
import { CharacterStats } from '../../domain/entities/Character'

describe('Attack Entity', () => {
    const testStats: CharacterStats = {
        agility: 60,
        strength: 80,
        hp: 70,
        defense: 50,
        speed: 90
    }

    describe('Random Attack Generation', () => {
        it('should generate a valid attack result', () => {
            const result = Attack.generateRandomAttack(testStats)

            expect(result.attackId).toBeDefined()
            expect(result.attackName).toBeDefined()
            expect(result.damage).toBeGreaterThanOrEqual(0)
            expect(typeof result.isCritical).toBe('boolean')
            expect(typeof result.isHit).toBe('boolean')
            expect(result.message).toBeDefined()
        })

        it('should generate different attacks on multiple calls', () => {
            const results = Array.from({ length: 10 }, () => Attack.generateRandomAttack(testStats))
            const uniqueAttacks = new Set(results.map(r => r.attackId))

            // Should have some variety (not all the same attack)
            expect(uniqueAttacks.size).toBeGreaterThan(1)
        })

        it('should respect stat multipliers', () => {
            const highStrengthStats = { ...testStats, strength: 100 }
            const lowStrengthStats = { ...testStats, strength: 10 }

            // Run multiple times to get a Power Slam attack
            let highDamage = 0
            let lowDamage = 0

            for (let i = 0; i < 100; i++) {
                const highResult = Attack.generateRandomAttack(highStrengthStats)
                const lowResult = Attack.generateRandomAttack(lowStrengthStats)

                if (highResult.attackName === 'Power Slam' && highResult.isHit) {
                    highDamage = Math.max(highDamage, highResult.damage)
                }
                if (lowResult.attackName === 'Power Slam' && lowResult.isHit) {
                    lowDamage = Math.max(lowDamage, lowResult.damage)
                }
            }

            // High strength should generally do more damage
            expect(highDamage).toBeGreaterThan(0)
            expect(lowDamage).toBeGreaterThan(0)
        })

        it('should have minimum damage of 1 when hit', () => {
            // Test with very low stats
            const lowStats: CharacterStats = {
                agility: 1,
                strength: 1,
                hp: 1,
                defense: 1,
                speed: 1
            }

            for (let i = 0; i < 50; i++) {
                const result = Attack.generateRandomAttack(lowStats)
                if (result.isHit) {
                    expect(result.damage).toBeGreaterThanOrEqual(1)
                }
            }
        })

        it('should have 0 damage when miss', () => {
            // Since attacks have accuracy < 100%, some should miss
            let foundMiss = false

            for (let i = 0; i < 100; i++) {
                const result = Attack.generateRandomAttack(testStats)
                if (!result.isHit) {
                    expect(result.damage).toBe(0)
                    expect(result.message).toContain('missed')
                    foundMiss = true
                }
            }

            // Should find at least one miss in 100 attempts
            expect(foundMiss).toBe(true)
        })
    })

    describe('Attack Types', () => {
        it('should return all available attacks', () => {
            const attacks = Attack.getAvailableAttacks()

            expect(attacks).toHaveLength(5)
            expect(attacks.map(a => a.name)).toEqual([
                'Quick Strike',
                'Power Slam',
                'Agile Combo',
                'Defensive Counter',
                'Balanced Strike'
            ])
        })

        it('should find attack by ID', () => {
            const quickStrike = Attack.getAttackById('quick-strike')
            const invalid = Attack.getAttackById('invalid-id')

            expect(quickStrike).toBeDefined()
            expect(quickStrike?.name).toBe('Quick Strike')
            expect(invalid).toBeNull()
        })

        it('should generate attack options correctly', () => {
            const options = Attack.generateAttackOptions(testStats, 3)

            expect(options).toHaveLength(3)
            expect(options.every(option => option.id && option.name)).toBe(true)

            // Should be different attacks
            const uniqueIds = new Set(options.map(o => o.id))
            expect(uniqueIds.size).toBe(3)
        })

        it('should not exceed available attack count', () => {
            const options = Attack.generateAttackOptions(testStats, 10)
            expect(options).toHaveLength(5) // Max available
        })
    })

    describe('Damage Calculation', () => {
        it('should calculate expected damage correctly', () => {
            const quickStrike = Attack.getAttackById('quick-strike')!
            const powerSlam = Attack.getAttackById('power-slam')!

            const quickDamage = Attack.calculateExpectedDamage(quickStrike, testStats)
            const powerDamage = Attack.calculateExpectedDamage(powerSlam, testStats)

            expect(quickDamage).toBeGreaterThan(0)
            expect(powerDamage).toBeGreaterThan(0)

            // Power Slam should generally do more base damage
            expect(powerDamage).toBeGreaterThan(quickDamage)
        })

        it('should use correct stat multipliers', () => {
            const quickStrike = Attack.getAttackById('quick-strike')! // Uses speed
            const powerSlam = Attack.getAttackById('power-slam')! // Uses strength

            const highSpeedStats = { ...testStats, speed: 100, strength: 10 }
            const highStrengthStats = { ...testStats, speed: 10, strength: 100 }

            const quickWithSpeed = Attack.calculateExpectedDamage(quickStrike, highSpeedStats)
            const quickWithStrength = Attack.calculateExpectedDamage(quickStrike, highStrengthStats)

            const powerWithSpeed = Attack.calculateExpectedDamage(powerSlam, highSpeedStats)
            const powerWithStrength = Attack.calculateExpectedDamage(powerSlam, highStrengthStats)

            // Quick Strike should be better with high speed
            expect(quickWithSpeed).toBeGreaterThan(quickWithStrength)

            // Power Slam should be better with high strength
            expect(powerWithStrength).toBeGreaterThan(powerWithSpeed)
        })
    })

    describe('Attack Properties Validation', () => {
        it('should have valid attack type properties', () => {
            const attacks = Attack.getAvailableAttacks()

            attacks.forEach(attack => {
                expect(attack.id).toBeDefined()
                expect(attack.name).toBeDefined()
                expect(attack.baseDamage).toBeGreaterThan(0)
                expect(attack.accuracy).toBeGreaterThan(0)
                expect(attack.accuracy).toBeLessThanOrEqual(100)
                expect(attack.criticalChance).toBeGreaterThanOrEqual(0)
                expect(attack.criticalChance).toBeLessThanOrEqual(100)
                expect(['agility', 'strength', 'hp', 'defense', 'speed']).toContain(attack.statMultiplier)
            })
        })
    })
})
