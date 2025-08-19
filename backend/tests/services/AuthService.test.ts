import { UserCredentials, UserProfile, UserRegistration } from '../../domain/entities/User'
import { UserRepository } from '../../domain/repositories/UserRepository'
import { AuthService } from '../../domain/services/AuthService'

// Mock UserRepository
const mockUserRepository: jest.Mocked<UserRepository> = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    updateProfile: jest.fn(),
    deleteUser: jest.fn(),
    updatePoints: jest.fn(),
    updateRanking: jest.fn(),
    updateStatus: jest.fn(),
    getTopPlayers: jest.fn(),
    getUsersByStatus: jest.fn(),
}

describe('AuthService', () => {
    let authService: AuthService

    beforeEach(() => {
        authService = new AuthService(mockUserRepository)
        jest.clearAllMocks()
    })

    describe('Sign Up', () => {
        const validUserData: UserRegistration = {
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123'
        }

        const mockUserProfile: UserProfile = {
            id: 'user-123',
            name: 'John Doe',
            email: 'john@example.com',
            points: 0,
            ranking: null,
            status: 'active',
            createdAt: new Date()
        }

        it('should sign up user with valid data', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null)
            mockUserRepository.signUp.mockResolvedValue(mockUserProfile)

            const result = await authService.signUp(validUserData)

            expect(result.success).toBe(true)
            expect(result.user).toEqual(mockUserProfile)
            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('john@example.com')
            expect(mockUserRepository.signUp).toHaveBeenCalledWith(validUserData)
        })

        it('should reject invalid name', async () => {
            const invalidData = { ...validUserData, name: 'J' }

            const result = await authService.signUp(invalidData)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Invalid name')
            expect(mockUserRepository.signUp).not.toHaveBeenCalled()
        })

        it('should reject invalid email', async () => {
            const invalidData = { ...validUserData, email: 'invalid-email' }

            const result = await authService.signUp(invalidData)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Invalid email format')
            expect(mockUserRepository.signUp).not.toHaveBeenCalled()
        })

        it('should reject short password', async () => {
            const invalidData = { ...validUserData, password: '123' }

            const result = await authService.signUp(invalidData)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Password must be at least 6 characters')
            expect(mockUserRepository.signUp).not.toHaveBeenCalled()
        })

        it('should reject existing email', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUserProfile)

            const result = await authService.signUp(validUserData)

            expect(result.success).toBe(false)
            expect(result.error).toContain('User with this email already exists')
            expect(mockUserRepository.signUp).not.toHaveBeenCalled()
        })

        it('should handle repository errors', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null)
            mockUserRepository.signUp.mockRejectedValue(new Error('Database error'))

            const result = await authService.signUp(validUserData)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Database error')
        })
    })

    describe('Sign In', () => {
        const validCredentials: UserCredentials = {
            email: 'john@example.com',
            password: 'password123'
        }

        const mockUserProfile: UserProfile = {
            id: 'user-123',
            name: 'John Doe',
            email: 'john@example.com',
            points: 100,
            ranking: 5,
            status: 'active',
            createdAt: new Date()
        }

        it('should sign in user with valid credentials', async () => {
            mockUserRepository.signIn.mockResolvedValue(mockUserProfile)

            const result = await authService.signIn(validCredentials)

            expect(result.success).toBe(true)
            expect(result.user).toEqual(mockUserProfile)
            expect(mockUserRepository.signIn).toHaveBeenCalledWith(validCredentials)
        })

        it('should reject invalid email format', async () => {
            const invalidCredentials = { ...validCredentials, email: 'invalid-email' }

            const result = await authService.signIn(invalidCredentials)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Invalid email format')
            expect(mockUserRepository.signIn).not.toHaveBeenCalled()
        })

        it('should reject empty password', async () => {
            const invalidCredentials = { ...validCredentials, password: '' }

            const result = await authService.signIn(invalidCredentials)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Password is required')
            expect(mockUserRepository.signIn).not.toHaveBeenCalled()
        })

        it('should handle authentication errors', async () => {
            mockUserRepository.signIn.mockRejectedValue(new Error('Invalid credentials'))

            const result = await authService.signIn(validCredentials)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Invalid credentials')
        })
    })

    describe('Sign Out', () => {
        it('should sign out successfully', async () => {
            mockUserRepository.signOut.mockResolvedValue()

            const result = await authService.signOut()

            expect(result.success).toBe(true)
            expect(mockUserRepository.signOut).toHaveBeenCalled()
        })

        it('should handle sign out errors', async () => {
            mockUserRepository.signOut.mockRejectedValue(new Error('Sign out failed'))

            const result = await authService.signOut()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Sign out failed')
        })
    })

    describe('Session Management', () => {
        it('should return null for getCurrentUser (not implemented)', async () => {
            const user = await authService.getCurrentUser()
            expect(user).toBeNull()
        })

        it('should return false for validateSession (not implemented)', async () => {
            const isValid = await authService.validateSession()
            expect(isValid).toBe(false)
        })
    })
})
