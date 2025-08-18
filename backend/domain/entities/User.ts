export interface UserProfile {
    id: string
    name: string
    email: string
    points: number
    ranking: number | null
    status: 'active' | 'inactive' | 'pending'
    createdAt: Date
}

export interface UserCredentials {
    email: string
    password: string
}

export interface UserRegistration extends UserCredentials {
    name: string
}

export class User {
    private _id: string
    private _name: string
    private _email: string
    private _points: number
    private _ranking: number | null
    private _status: 'active' | 'inactive' | 'pending'
    private _createdAt: Date

    constructor(
        id: string,
        name: string,
        email: string,
        points: number = 0,
        ranking: number | null = null,
        status: 'active' | 'inactive' | 'pending' = 'active',
        createdAt: Date = new Date()
    ) {
        this._id = id
        this._name = name
        this._email = email
        this._points = points
        this._ranking = ranking
        this._status = status
        this._createdAt = createdAt
    }

    // Getters
    get id(): string { return this._id }
    get name(): string { return this._name }
    get email(): string { return this._email }
    get points(): number { return this._points }
    get ranking(): number | null { return this._ranking }
    get status(): 'active' | 'inactive' | 'pending' { return this._status }
    get createdAt(): Date { return this._createdAt }

    // Business logic methods
    addPoints(points: number): void {
        if (points < 0) {
            throw new Error('Points cannot be negative')
        }
        this._points += points
    }

    updateRanking(ranking: number | null): void {
        this._ranking = ranking
    }

    updateStatus(status: 'active' | 'inactive' | 'pending'): void {
        this._status = status
    }

    // Validation methods
    static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    static validateName(name: string): boolean {
        return name.trim().length >= 2 && name.trim().length <= 50
    }

    // Factory method for creating new users
    static create(name: string, email: string): User {
        if (!User.validateName(name)) {
            throw new Error('Invalid name: must be between 2 and 50 characters')
        }
        if (!User.validateEmail(email)) {
            throw new Error('Invalid email format')
        }

        return new User(
            crypto.randomUUID(),
            name.trim(),
            email.toLowerCase().trim()
        )
    }

    // Convert to plain object
    toJSON(): UserProfile {
        return {
            id: this._id,
            name: this._name,
            email: this._email,
            points: this._points,
            ranking: this._ranking,
            status: this._status,
            createdAt: this._createdAt
        }
    }
}
