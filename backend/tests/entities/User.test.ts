import { User } from '../../domain/entities/User'

describe('User Entity', () => {
    describe('User Creation', () => {
        it('should create a user with valid data', () => {
            const user = User.create('John Doe', 'john@example.com')

            expect(user.name).toBe('John Doe')
            expect(user.email).toBe('john@example.com')
            expect(user.points).toBe(0)
            expect(user.ranking).toBeNull()
            expect(user.status).toBe('active')
            expect(user.id).toBeDefined()
        })

        it('should throw error for invalid name', () => {
            expect(() => User.create('J', 'john@example.com')).toThrow('Invalid name')
            expect(() => User.create('', 'john@example.com')).toThrow('Invalid name')
            expect(() => User.create('A'.repeat(51), 'john@example.com')).toThrow('Invalid name')
        })

        it('should throw error for invalid email', () => {
            expect(() => User.create('John Doe', 'invalid-email')).toThrow('Invalid email format')
            expect(() => User.create('John Doe', 'test@')).toThrow('Invalid email format')
            expect(() => User.create('John Doe', '@example.com')).toThrow('Invalid email format')
        })

        it('should normalize email to lowercase', () => {
            const user = User.create('John Doe', 'JOHN@EXAMPLE.COM')
            expect(user.email).toBe('john@example.com')
        })

        it('should trim whitespace from name', () => {
            const user = User.create('  John Doe  ', 'john@example.com')
            expect(user.name).toBe('John Doe')
        })
    })

    describe('User Business Logic', () => {
        let user: User

        beforeEach(() => {
            user = User.create('John Doe', 'john@example.com')
        })

        it('should add points correctly', () => {
            user.addPoints(100)
            expect(user.points).toBe(100)

            user.addPoints(50)
            expect(user.points).toBe(150)
        })

        it('should not allow negative points', () => {
            expect(() => user.addPoints(-10)).toThrow('Points cannot be negative')
        })

        it('should update ranking', () => {
            user.updateRanking(1)
            expect(user.ranking).toBe(1)

            user.updateRanking(null)
            expect(user.ranking).toBeNull()
        })

        it('should update status', () => {
            user.updateStatus('inactive')
            expect(user.status).toBe('inactive')

            user.updateStatus('pending')
            expect(user.status).toBe('pending')
        })

        it('should convert to JSON correctly', () => {
            user.addPoints(100)
            user.updateRanking(5)

            const json = user.toJSON()

            expect(json).toEqual({
                id: user.id,
                name: 'John Doe',
                email: 'john@example.com',
                points: 100,
                ranking: 5,
                status: 'active',
                createdAt: user.createdAt
            })
        })
    })

    describe('User Validation', () => {
        it('should validate email format correctly', () => {
            expect(User.validateEmail('test@example.com')).toBe(true)
            expect(User.validateEmail('user+tag@domain.co.uk')).toBe(true)
            expect(User.validateEmail('invalid-email')).toBe(false)
            expect(User.validateEmail('test@')).toBe(false)
            expect(User.validateEmail('@example.com')).toBe(false)
        })

        it('should validate name length correctly', () => {
            expect(User.validateName('Jo')).toBe(true)
            expect(User.validateName('John Doe')).toBe(true)
            expect(User.validateName('A'.repeat(50))).toBe(true)
            expect(User.validateName('J')).toBe(false)
            expect(User.validateName('')).toBe(false)
            expect(User.validateName('A'.repeat(51))).toBe(false)
        })
    })
})
