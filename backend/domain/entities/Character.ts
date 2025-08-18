export interface CharacterStats {
    agility: number
    strength: number
    hp: number
    defense: number
    speed: number
}

export interface CharacterProfile {
    id: string
    tierId: number
    name: string
    stats: CharacterStats
    createdAt: Date
}

export class Character {
    private _id: string
    private _tierId: number
    private _name: string
    private _stats: CharacterStats
    private _createdAt: Date

    constructor(
        id: string,
        tierId: number,
        name: string,
        stats: CharacterStats,
        createdAt: Date = new Date()
    ) {
        this._id = id
        this._tierId = tierId
        this._name = name
        this._stats = stats
        this._createdAt = createdAt
    }

    // Getters
    get id(): string { return this._id }
    get tierId(): number { return this._tierId }
    get name(): string { return this._name }
    get stats(): CharacterStats { return { ...this._stats } }
    get createdAt(): Date { return this._createdAt }

    // Business logic methods
    updateStats(newStats: Partial<CharacterStats>): void {
        this._stats = { ...this._stats, ...newStats }
        this.validateStats()
    }

    upgradeTier(newTierId: number): void {
        if (newTierId <= this._tierId) {
            throw new Error('New tier must be higher than current tier')
        }
        this._tierId = newTierId
    }

    getPowerLevel(): number {
        return this._stats.agility + this._stats.strength + this._stats.hp + this._stats.defense + this._stats.speed
    }

    isAlive(): boolean {
        return this._stats.hp > 0
    }

    takeDamage(damage: number): void {
        if (damage < 0) {
            throw new Error('Damage cannot be negative')
        }
        this._stats.hp = Math.max(0, this._stats.hp - damage)
    }

    heal(amount: number): void {
        if (amount < 0) {
            throw new Error('Heal amount cannot be negative')
        }
        this._stats.hp = Math.min(100, this._stats.hp + amount)
    }

    // Validation methods
    private validateStats(): void {
        const { agility, strength, hp, defense, speed } = this._stats
        
        if (agility < 0 || agility > 100) throw new Error('Agility must be between 0 and 100')
        if (strength < 0 || strength > 100) throw new Error('Strength must be between 0 and 100')
        if (hp < 0 || hp > 100) throw new Error('HP must be between 0 and 100')
        if (defense < 0 || defense > 100) throw new Error('Defense must be between 0 and 100')
        if (speed < 0 || speed > 100) throw new Error('Speed must be between 0 and 100')
    }

    static validateName(name: string): boolean {
        return name.trim().length >= 2 && name.trim().length <= 30
    }

    // Factory method for creating new characters
    static create(tierId: number, name: string, stats: CharacterStats): Character {
        if (!Character.validateName(name)) {
            throw new Error('Invalid name: must be between 2 and 30 characters')
        }

        const character = new Character(
            crypto.randomUUID(),
            tierId,
            name.trim(),
            stats
        )
        
        character.validateStats()
        return character
    }

    // Convert to plain object
    toJSON(): CharacterProfile {
        return {
            id: this._id,
            tierId: this._tierId,
            name: this._name,
            stats: { ...this._stats },
            createdAt: this._createdAt
        }
    }
}
