/**
 * API Service for CaosFighters
 * Centralized HTTP client for backend communication
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_CONFIG, getFullUrl } from '../config/api'
import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    TokenRefreshResponse,
    UserProfileResponse,
} from '../types/auth'

/**
 * Storage keys for AsyncStorage
 */
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
} as const

/**
 * API Service Class
 * Handles all HTTP requests to the Laravel backend
 */
class ApiService {
    private baseURL: string
    private timeout: number

    constructor() {
        this.baseURL = API_CONFIG.BASE_URL
        this.timeout = API_CONFIG.TIMEOUT
    }

    /**
     * Get authentication headers with Bearer token if available
     */
    private async getAuthHeaders(): Promise<Record<string, string>> {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)

        return {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        }
    }

    /**
     * Generic method to make HTTP requests
     */
    private async makeRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = getFullUrl(endpoint)
        const headers = await this.getAuthHeaders()

        const config: RequestInit = {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
        }

        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        try {
            const response = await fetch(url, {
                ...config,
                signal: controller.signal,
            })

            clearTimeout(timeoutId)

            // Parse response
            const data = await response.json()

            // Check if response is ok
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`)
            }

            return data as T
        } catch (error) {
            clearTimeout(timeoutId)

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout - please try again')
                }
                throw error
            }

            throw new Error('Network error occurred')
        }
    }

    /**
     * Authentication Methods
     */

    /**
     * Login user with email and password
     */
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        return this.makeRequest<AuthResponse>(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
            method: 'POST',
            body: JSON.stringify(credentials),
        })
    }

    /**
     * Register new user
     */
    async register(userData: RegisterRequest): Promise<AuthResponse> {
        return this.makeRequest<AuthResponse>(
            API_CONFIG.ENDPOINTS.AUTH.REGISTER,
            {
                method: 'POST',
                body: JSON.stringify(userData),
            }
        )
    }

    /**
     * Logout current user
     */
    async logout(): Promise<{ success: boolean; message: string }> {
        return this.makeRequest(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {
            method: 'POST',
        })
    }

    /**
     * Get current authenticated user profile
     */
    async getMe(): Promise<UserProfileResponse> {
        return this.makeRequest<UserProfileResponse>(
            API_CONFIG.ENDPOINTS.AUTH.ME,
            {
                method: 'GET',
            }
        )
    }

    /**
     * Refresh authentication token
     */
    async refreshToken(): Promise<TokenRefreshResponse> {
        return this.makeRequest<TokenRefreshResponse>(
            API_CONFIG.ENDPOINTS.AUTH.REFRESH,
            {
                method: 'POST',
            }
        )
    }

    /**
     * Update user's Expo push token
     */
    async updatePushToken(
        expoPushToken: string
    ): Promise<{ success: boolean; message: string }> {
        return this.makeRequest(API_CONFIG.ENDPOINTS.AUTH.UPDATE_PUSH_TOKEN, {
            method: 'POST',
            body: JSON.stringify({ expo_push_token: expoPushToken }),
        })
    }

    /**
     * Storage Helper Methods
     */

    /**
     * Store authentication data
     */
    async storeAuthData(token: string, userData: any): Promise<void> {
        await AsyncStorage.multiSet([
            [STORAGE_KEYS.AUTH_TOKEN, token],
            [STORAGE_KEYS.USER_DATA, JSON.stringify(userData)],
        ])
    }

    /**
     * Clear authentication data
     */
    async clearAuthData(): Promise<void> {
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.AUTH_TOKEN,
            STORAGE_KEYS.USER_DATA,
        ])
    }

    /**
     * Get stored authentication data
     */
    async getStoredAuthData(): Promise<{
        token: string | null
        userData: any | null
    }> {
        const [token, userDataString] = await AsyncStorage.multiGet([
            STORAGE_KEYS.AUTH_TOKEN,
            STORAGE_KEYS.USER_DATA,
        ])

        return {
            token: token[1],
            userData: userDataString[1]
                ? JSON.parse(userDataString[1])
                : null,
        }
    }
}

// Export singleton instance
export const apiService = new ApiService()

