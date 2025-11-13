/**
 * Authentication Types for CaosFighters
 * Type definitions for user authentication and authorization
 */

/**
 * User entity representing an authenticated user
 */
export interface User {
    id: string
    name: string
    email: string
    points: number
    ranking: number | null
    status: 'active' | 'inactive' | 'pending'
    created_at?: string
    expo_push_token?: string | null
    proximity_notifications_enabled?: boolean
}

/**
 * Login request payload
 */
export interface LoginRequest {
    email: string
    password: string
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
    name: string
    email: string
    password: string
    password_confirmation: string
    status?: 'active' | 'inactive' | 'pending'
}

/**
 * Successful login/register response from API
 */
export interface AuthSuccessResponse {
    success: true
    message: string
    data: {
        user: User
        token: string
        token_type: string
    }
}

/**
 * Error response from API
 */
export interface AuthErrorResponse {
    success: false
    message: string
    errors?: Record<string, string[]>
    error?: string
}

/**
 * Combined auth response type
 */
export type AuthResponse = AuthSuccessResponse | AuthErrorResponse

/**
 * Local authentication state
 */
export interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
}

/**
 * Result type for login/register operations
 */
export interface AuthResult {
    success: boolean
    user?: User
    error?: string
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
    success: boolean
    message: string
    data?: {
        token: string
        token_type: string
    }
}

/**
 * User profile response
 */
export interface UserProfileResponse {
    success: boolean
    data?: User
    message?: string
    error?: string
}

