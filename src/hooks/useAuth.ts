/**
 * useAuth Hook for CaosFighters
 * Custom hook for managing authentication state and operations
 */

import { useCallback, useEffect, useState } from 'react'
import { apiService } from '../services/api'
import type {
    AuthResult,
    AuthState,
    LoginRequest,
    RegisterRequest
} from '../types/auth'

/**
 * Custom hook for authentication
 * Provides login, register, logout functionality and auth state
 */
export const useAuth = () => {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
    })

    /**
     * Initialize auth state from stored data on app start
     */
    useEffect(() => {
        initializeAuth()
    }, [])

    /**
     * Load stored authentication data
     */
    const initializeAuth = async () => {
        try {
            const { token, userData } = await apiService.getStoredAuthData()

            if (token && userData) {
                setAuthState({
                    user: userData,
                    token,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                })
            } else {
                setAuthState((prev) => ({ ...prev, isLoading: false }))
            }
        } catch (error) {
            console.error('Failed to initialize auth:', error)
            setAuthState({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'Failed to initialize authentication',
            })
        }
    }

    /**
     * Login with email and password
     */
    const login = useCallback(
        async (credentials: LoginRequest): Promise<AuthResult> => {
            try {
                setAuthState((prev) => ({
                    ...prev,
                    isLoading: true,
                    error: null,
                }))

                const response = await apiService.login(credentials)

                if (response.success && response.data) {
                    const { user, token } = response.data

                    // Store token and user data
                    await apiService.storeAuthData(token, user)

                    setAuthState({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    })

                    return { success: true, user }
                } else {
                    const errorMessage =
                        !response.success ? response.message : 'Login failed'

                    setAuthState((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: errorMessage,
                    }))

                    return { success: false, error: errorMessage }
                }
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : 'Login failed'

                setAuthState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }))

                return { success: false, error: errorMessage }
            }
        },
        []
    )

    /**
     * Register new user
     */
    const register = useCallback(
        async (userData: RegisterRequest): Promise<AuthResult> => {
            try {
                setAuthState((prev) => ({
                    ...prev,
                    isLoading: true,
                    error: null,
                }))

                const response = await apiService.register(userData)

                if (response.success && response.data) {
                    const { user, token } = response.data

                    // Store token and user data
                    await apiService.storeAuthData(token, user)

                    setAuthState({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    })

                    return { success: true, user }
                } else {
                    const errorMessage =
                        !response.success
                            ? response.message
                            : 'Registration failed'

                    setAuthState((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: errorMessage,
                    }))

                    return { success: false, error: errorMessage }
                }
            } catch (error) {
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : 'Registration failed'

                setAuthState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }))

                return { success: false, error: errorMessage }
            }
        },
        []
    )

    /**
     * Logout current user
     */
    const logout = useCallback(async () => {
        try {
            // Call logout API endpoint
            await apiService.logout()
        } catch (error) {
            // Continue with logout even if API call fails
            console.warn('Logout API call failed:', error)
        }

        // Clear stored data
        await apiService.clearAuthData()

        // Reset auth state
        setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        })
    }, [])

    /**
     * Clear error message
     */
    const clearError = useCallback(() => {
        setAuthState((prev) => ({ ...prev, error: null }))
    }, [])

    /**
     * Refresh user profile from server
     */
    const refreshUserProfile = useCallback(async (): Promise<boolean> => {
        try {
            const response = await apiService.getMe()

            if (response.success && response.data) {
                const user = response.data

                // Update stored user data
                if (authState.token) {
                    await apiService.storeAuthData(authState.token, user)
                }

                setAuthState((prev) => ({
                    ...prev,
                    user,
                }))

                return true
            }

            return false
        } catch (error) {
            console.error('Failed to refresh user profile:', error)
            return false
        }
    }, [authState.token])

    return {
        // State
        ...authState,

        // Methods
        login,
        register,
        logout,
        clearError,
        refreshUserProfile,
    }
}

