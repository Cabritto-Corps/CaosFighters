import { User, UserCredentials, UserProfile, UserRegistration } from '../entities/User'
import { UserRepository } from '../repositories/UserRepository'

export interface AuthResult {
    success: boolean
    user?: UserProfile
    error?: string
}

export class AuthService {
    private userRepository: UserRepository

    constructor(userRepository: UserRepository) {
        this.userRepository = userRepository
    }

    async signUp(userData: UserRegistration): Promise<AuthResult> {
        try {
            // Validate input data
            if (!User.validateName(userData.name)) {
                return {
                    success: false,
                    error: 'Invalid name: must be between 2 and 50 characters'
                }
            }

            if (!User.validateEmail(userData.email)) {
                return {
                    success: false,
                    error: 'Invalid email format'
                }
            }

            if (userData.password.length < 6) {
                return {
                    success: false,
                    error: 'Password must be at least 6 characters long'
                }
            }

            // Check if user already exists
            const existingUser = await this.userRepository.findByEmail(userData.email)
            if (existingUser) {
                return {
                    success: false,
                    error: 'User with this email already exists'
                }
            }

            // Create user
            const user = await this.userRepository.signUp(userData)

            return {
                success: true,
                user
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Sign up failed'
            }
        }
    }

    async signIn(credentials: UserCredentials): Promise<AuthResult> {
        try {
            // Validate input data
            if (!User.validateEmail(credentials.email)) {
                return {
                    success: false,
                    error: 'Invalid email format'
                }
            }

            if (!credentials.password) {
                return {
                    success: false,
                    error: 'Password is required'
                }
            }

            // Attempt to sign in
            const user = await this.userRepository.signIn(credentials)

            return {
                success: true,
                user
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Sign in failed'
            }
        }
    }

    async signOut(): Promise<AuthResult> {
        try {
            await this.userRepository.signOut()

            return {
                success: true
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Sign out failed'
            }
        }
    }

    async getCurrentUser(): Promise<UserProfile | null> {
        try {
            // This would typically get the current user from a session or token
            // For now, we'll return null as we need to implement session management
            return null
        } catch (error) {
            console.error('Error getting current user:', error)
            return null
        }
    }

    async validateSession(): Promise<boolean> {
        try {
            const currentUser = await this.getCurrentUser()
            return currentUser !== null
        } catch (error) {
            return false
        }
    }
}
