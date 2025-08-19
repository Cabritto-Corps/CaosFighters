import { CharacterStats } from './Character'

export interface AttackType {
    id: string
    name: string
    baseDamage: number
    statMultiplier: keyof CharacterStats // Which stat affects this attack
    criticalChance: number // 0-100 percentage
    accuracy: number // 0-100 percentage
    description: string
}

export interface AttackResult {
    attackId: string
    attackName: string
    damage: number
    isCritical: boolean
    isHit: boolean
    message: string
}

export class Attack {
    private static readonly ATTACK_TYPES: AttackType[] = [
        {
            id: 'quick-strike',
            name: 'Quick Strike',
            baseDamage: 8,
            statMultiplier: 'speed',
            criticalChance: 15,
            accuracy: 90,
            description: 'A fast, precise attack that relies on speed'
        },
        {
            id: 'power-slam',
            name: 'Power Slam',
            baseDamage: 15,
            statMultiplier: 'strength',
            criticalChance: 10,
            accuracy: 75,
            description: 'A devastating attack that relies on raw strength'
        },
        {
            id: 'agile-combo',
            name: 'Agile Combo',
            baseDamage: 12,
            statMultiplier: 'agility',
            criticalChance: 20,
            accuracy: 85,
            description: 'A series of quick strikes that relies on agility'
        },
        {
            id: 'defensive-counter',
            name: 'Defensive Counter',
            baseDamage: 10,
            statMultiplier: 'defense',
            criticalChance: 12,
            accuracy: 80,
            description: 'A counter-attack that turns defense into offense'
        },
        {
            id: 'balanced-strike',
            name: 'Balanced Strike',
            baseDamage: 10,
            statMultiplier: 'hp',
            criticalChance: 15,
            accuracy: 85,
            description: 'A well-rounded attack that uses endurance'
        }
    ]

    static generateRandomAttack(attackerStats: CharacterStats): AttackResult {
        // Randomly select an attack type
        const randomIndex = Math.floor(Math.random() * this.ATTACK_TYPES.length)
        const attackType = this.ATTACK_TYPES[randomIndex]

        if (!attackType) {
            throw new Error('Failed to select attack type')
        }

        // Check if attack hits (accuracy check)
        const hitRoll = Math.random() * 100
        const isHit = hitRoll <= attackType.accuracy

        if (!isHit) {
            return {
                attackId: attackType.id,
                attackName: attackType.name,
                damage: 0,
                isCritical: false,
                isHit: false,
                message: `${attackType.name} missed!`
            }
        }

        // Calculate damage based on character stats
        const statValue = attackerStats[attackType.statMultiplier]
        const statMultiplier = 1 + (statValue / 100) // 0-100 stat becomes 1.0-2.0 multiplier

        let damage = Math.floor(attackType.baseDamage * statMultiplier)

        // Check for critical hit
        const critRoll = Math.random() * 100
        const isCritical = critRoll <= attackType.criticalChance

        if (isCritical) {
            damage = Math.floor(damage * 1.5) // 50% more damage on crit
        }

        // Add some randomness (±20%)
        const randomMultiplier = 0.8 + (Math.random() * 0.4) // 0.8 to 1.2
        damage = Math.floor(damage * randomMultiplier)

        // Ensure minimum damage of 1
        damage = Math.max(1, damage)

        const message = isCritical
            ? `Critical ${attackType.name}! Dealt ${damage} damage!`
            : `${attackType.name} hit for ${damage} damage!`

        return {
            attackId: attackType.id,
            attackName: attackType.name,
            damage,
            isCritical,
            isHit: true,
            message
        }
    }

    static getAvailableAttacks(): AttackType[] {
        return [...this.ATTACK_TYPES]
    }

    static getAttackById(id: string): AttackType | null {
        return this.ATTACK_TYPES.find(attack => attack.id === id) || null
    }

    // Generate multiple attack options for player to choose from
    static generateAttackOptions(_attackerStats: CharacterStats, count: number = 3): AttackType[] {
        const shuffled = [...this.ATTACK_TYPES].sort(() => Math.random() - 0.5)
        return shuffled.slice(0, Math.min(count, this.ATTACK_TYPES.length))
    }

    // Calculate expected damage for an attack (for UI preview)
    static calculateExpectedDamage(attackType: AttackType, attackerStats: CharacterStats): number {
        const statValue = attackerStats[attackType.statMultiplier]
        const statMultiplier = 1 + (statValue / 100)
        return Math.floor(attackType.baseDamage * statMultiplier)
    }
}
