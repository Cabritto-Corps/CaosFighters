export interface BattleParticipant {
    userId: string
    characterId: string
    currentHp: number
    maxHp: number
    isAlive: boolean
}

export interface BattleState {
    id: string
    player1: BattleParticipant
    player2: BattleParticipant
    winnerId: string | null
    currentTurn: string | null
    duration: number | null
    battleTimestamp: Date
    createdAt: Date
}

export type BattleStatus = 'pending' | 'active' | 'completed' | 'cancelled'

export class Battle {
    private _id: string
    private _player1: BattleParticipant
    private _player2: BattleParticipant
    private _winnerId: string | null
    private _currentTurn: string | null
    private _status: BattleStatus
    private _duration: number | null
    private _battleTimestamp: Date
    private _createdAt: Date

    constructor(
        id: string,
        player1: BattleParticipant,
        player2: BattleParticipant,
        status: BattleStatus = 'pending',
        winnerId: string | null = null,
        currentTurn: string | null = null,
        duration: number | null = null,
        battleTimestamp: Date = new Date(),
        createdAt: Date = new Date()
    ) {
        this._id = id
        this._player1 = player1
        this._player2 = player2
        this._winnerId = winnerId
        this._currentTurn = currentTurn
        this._status = status
        this._duration = duration
        this._battleTimestamp = battleTimestamp
        this._createdAt = createdAt
    }

    // Getters
    get id(): string { return this._id }
    get player1(): BattleParticipant { return { ...this._player1 } }
    get player2(): BattleParticipant { return { ...this._player2 } }
    get winnerId(): string | null { return this._winnerId }
    get currentTurn(): string | null { return this._currentTurn }
    get status(): BattleStatus { return this._status }
    get duration(): number | null { return this._duration }
    get battleTimestamp(): Date { return this._battleTimestamp }
    get createdAt(): Date { return this._createdAt }

    // Business logic methods
    startBattle(): void {
        if (this._status !== 'pending') {
            throw new Error('Battle can only be started when pending')
        }
        
        this._status = 'active'
        this._currentTurn = this._player1.userId
        this._battleTimestamp = new Date()
    }

    endBattle(winnerId: string): void {
        if (this._status !== 'active') {
            throw new Error('Battle can only be ended when active')
        }

        if (winnerId !== this._player1.userId && winnerId !== this._player2.userId) {
            throw new Error('Winner must be one of the battle participants')
        }

        this._status = 'completed'
        this._winnerId = winnerId
        this._currentTurn = null
        this._duration = Date.now() - this._battleTimestamp.getTime()
    }

    cancelBattle(): void {
        if (this._status === 'completed') {
            throw new Error('Cannot cancel a completed battle')
        }
        
        this._status = 'cancelled'
        this._currentTurn = null
    }

    switchTurn(): void {
        if (this._status !== 'active') {
            throw new Error('Can only switch turns during active battle')
        }

        this._currentTurn = this._currentTurn === this._player1.userId 
            ? this._player2.userId 
            : this._player1.userId
    }

    attack(attackerId: string, targetId: string, damage: number): void {
        if (this._status !== 'active') {
            throw new Error('Can only attack during active battle')
        }

        if (this._currentTurn !== attackerId) {
            throw new Error('Not your turn to attack')
        }

        if (attackerId === targetId) {
            throw new Error('Cannot attack yourself')
        }

        // Apply damage to target
        if (targetId === this._player1.userId) {
            this._player1.currentHp = Math.max(0, this._player1.currentHp - damage)
            this._player1.isAlive = this._player1.currentHp > 0
        } else if (targetId === this._player2.userId) {
            this._player2.currentHp = Math.max(0, this._player2.currentHp - damage)
            this._player2.isAlive = this._player2.currentHp > 0
        } else {
            throw new Error('Invalid target')
        }

        // Check if battle should end
        if (!this._player1.isAlive || !this._player2.isAlive) {
            const winnerId = this._player1.isAlive ? this._player1.userId : this._player2.userId
            this.endBattle(winnerId)
        } else {
            this.switchTurn()
        }
    }

    getParticipant(userId: string): BattleParticipant | null {
        if (userId === this._player1.userId) return { ...this._player1 }
        if (userId === this._player2.userId) return { ...this._player2 }
        return null
    }

    isParticipant(userId: string): boolean {
        return userId === this._player1.userId || userId === this._player2.userId
    }

    // Factory method for creating new battles
    static create(player1Id: string, player2Id: string, character1Id: string, character2Id: string): Battle {
        if (player1Id === player2Id) {
            throw new Error('Players cannot battle themselves')
        }

        const player1: BattleParticipant = {
            userId: player1Id,
            characterId: character1Id,
            currentHp: 100,
            maxHp: 100,
            isAlive: true
        }

        const player2: BattleParticipant = {
            userId: player2Id,
            characterId: character2Id,
            currentHp: 100,
            maxHp: 100,
            isAlive: true
        }

        return new Battle(
            crypto.randomUUID(),
            player1,
            player2
        )
    }

    // Convert to plain object
    toJSON(): BattleState {
        return {
            id: this._id,
            player1: { ...this._player1 },
            player2: { ...this._player2 },
            winnerId: this._winnerId,
            currentTurn: this._currentTurn,
            duration: this._duration,
            battleTimestamp: this._battleTimestamp,
            createdAt: this._createdAt
        }
    }
}
