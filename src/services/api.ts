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
import type {
    CharacterApiResponse
} from '../types/character'
import type {
    BattleStartResponse,
    BattleAttackResponse,
    BattleResultsResponse,
    BattleHistoryResponse,
    BattleDetailsResponse,
    MatchmakingJoinRequest,
    MatchmakingJoinResponse,
} from '../types/battle'
import type {
    RankingResponse,
    UserPositionResponse,
} from '../types/ranking'

/**
 * Storage keys for AsyncStorage
 */
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    USER_CURRENT_CHARACTER: 'user_current_character',
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
            'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning page
            ...(token && { Authorization: `Bearer ${token}` }),
        }
    }

    /**
     * Get headers without authentication
     */
    private getBasicHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning page
        }
    }

    /**
     * Generic method to make HTTP requests without authentication
     */
    private async makeRequestWithoutAuth<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = getFullUrl(endpoint)
        const headers = this.getBasicHeaders()

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
            console.log(`Making request to: ${url}`, { headers })

            const response = await fetch(url, {
                ...config,
                signal: controller.signal,
            })

            clearTimeout(timeoutId)

            console.log(`Response status: ${response.status}`)

            // Try to parse response as JSON, but handle non-JSON responses
            let data
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await response.json()
                } catch (jsonError) {
                    console.error('Failed to parse JSON response:', jsonError)
                    throw new Error(`Invalid JSON response from server: ${response.status}`)
                }
            } else {
                const textResponse = await response.text()
                console.error('Non-JSON response:', textResponse.substring(0, 500)) // Log first 500 chars
                
                // If it's an error response (4xx or 5xx), provide a more helpful error message
                if (!response.ok) {
                    // Try to extract error information from HTML if possible
                    const errorMatch = textResponse.match(/<title>(.*?)<\/title>/i) || 
                                      textResponse.match(/<h1>(.*?)<\/h1>/i) ||
                                      textResponse.match(/Error:\s*(.*?)(?:\n|<)/i)
                    
                    const errorMessage = errorMatch ? errorMatch[1] : `Server returned HTML instead of JSON`
                    throw new Error(`HTTP ${response.status}: ${errorMessage}`)
                }
                
                throw new Error(`Expected JSON response but got: ${contentType || 'unknown'}`)
            }

            // Check if response is ok
            if (!response.ok) {
                console.error('Request failed:', { status: response.status, data })
                throw new Error(data?.message || `HTTP ${response.status}: ${data?.error || 'Server error'}`)
            }

            return data as T
        } catch (error) {
            clearTimeout(timeoutId)

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout - please try again')
                }
                console.error('Fetch error:', error.message, { url, error })
                throw error
            }

            throw new Error('Network error occurred')
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
            console.log(`Making request to: ${url}`, { headers })

            const response = await fetch(url, {
                ...config,
                signal: controller.signal,
            })

            clearTimeout(timeoutId)

            console.log(`Response status: ${response.status}`)

            // Try to parse response as JSON, but handle non-JSON responses
            let data
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await response.json()
                } catch (jsonError) {
                    console.error('Failed to parse JSON response:', jsonError)
                    throw new Error(`Invalid JSON response from server: ${response.status}`)
                }
            } else {
                const textResponse = await response.text()
                console.error('Non-JSON response:', textResponse.substring(0, 500)) // Log first 500 chars
                
                // If it's an error response (4xx or 5xx), provide a more helpful error message
                if (!response.ok) {
                    // Try to extract error information from HTML if possible
                    const errorMatch = textResponse.match(/<title>(.*?)<\/title>/i) || 
                                      textResponse.match(/<h1>(.*?)<\/h1>/i) ||
                                      textResponse.match(/Error:\s*(.*?)(?:\n|<)/i)
                    
                    const errorMessage = errorMatch ? errorMatch[1] : `Server returned HTML instead of JSON`
                    throw new Error(`HTTP ${response.status}: ${errorMessage}`)
                }
                
                throw new Error(`Expected JSON response but got: ${contentType || 'unknown'}`)
            }

            // Check if response is ok
            if (!response.ok) {
                console.error('Request failed:', { status: response.status, data })
                throw new Error(data?.message || `HTTP ${response.status}: ${data?.error || 'Server error'}`)
            }

            return data as T
        } catch (error) {
            clearTimeout(timeoutId)

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout - please try again')
                }
                console.error('Fetch error:', error.message, { url, error })
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
     * Character Methods
     */

    /**
     * Get current character (with user_id if logged in)
     */
    async getUserCurrentCharacter(): Promise<CharacterApiResponse> {
        try {
            const { userData } = await this.getStoredAuthData()
            const userId = userData?.id

            let url = API_CONFIG.ENDPOINTS.CHARACTERS.CURRENT
            if (userId) {
                url += `?user_id=${encodeURIComponent(userId)}`
            }

            return this.makeRequestWithoutAuth<CharacterApiResponse>(
                url,
                {
                    method: 'GET',
                }
            )
        } catch (error) {
            // Fallback to no user_id if there's an error getting user data
            return this.makeRequestWithoutAuth<CharacterApiResponse>(
                API_CONFIG.ENDPOINTS.CHARACTERS.CURRENT,
                {
                    method: 'GET',
                }
            )
        }
    }

    /**
     * Regenerate character (with user_id if logged in)
     */
    async regenerateCharacter(): Promise<CharacterApiResponse> {
        try {
            const { userData } = await this.getStoredAuthData()
            const userId = userData?.id

            const body = userId ? { user_id: userId } : {}

            return this.makeRequestWithoutAuth<CharacterApiResponse>(
                API_CONFIG.ENDPOINTS.CHARACTERS.REGENERATE,
                {
                    method: 'POST',
                    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
                }
            )
        } catch (error) {
            // Fallback to no user_id if there's an error getting user data
            return this.makeRequestWithoutAuth<CharacterApiResponse>(
                API_CONFIG.ENDPOINTS.CHARACTERS.REGENERATE,
                {
                    method: 'POST',
                }
            )
        }
    }

    /**
     * Battle Methods
     */

    /**
     * Start a new battle against a bot
     */
    async startBotBattle(characterUserId: string): Promise<BattleStartResponse> {
        try {
            const { userData } = await this.getStoredAuthData()
            const userId = userData?.id

            if (!userId) {
                throw new Error('User ID is required to start a battle')
            }

            return this.makeRequestWithoutAuth<BattleStartResponse>(
                API_CONFIG.ENDPOINTS.BATTLES.START,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        character_user_id: characterUserId,
                        user_id: userId,
                        is_multiplayer: false,
                    }),
                }
            )
        } catch (error) {
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Failed to start battle')
        }
    }

    /**
     * Start a multiplayer battle - joins matchmaking queue
     */
    async startMultiplayerBattle(characterUserId: string): Promise<MatchmakingJoinResponse> {
        try {
            const { userData } = await this.getStoredAuthData()
            const userId = userData?.id

            if (!userId) {
                throw new Error('User ID is required to start a multiplayer battle')
            }

            return this.makeRequestWithoutAuth<MatchmakingJoinResponse>(
                API_CONFIG.ENDPOINTS.BATTLES.MATCHMAKING.JOIN,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        character_user_id: characterUserId,
                        user_id: userId,
                    }),
                }
            )
        } catch (error) {
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Failed to join matchmaking')
        }
    }

    /**
     * Leave matchmaking queue
     */
    async leaveMatchmaking(): Promise<{ success: boolean; message?: string }> {
        try {
            const { userData } = await this.getStoredAuthData()
            const userId = userData?.id

            if (!userId) {
                throw new Error('User ID is required to leave matchmaking')
            }

            return this.makeRequestWithoutAuth(
                API_CONFIG.ENDPOINTS.BATTLES.MATCHMAKING.LEAVE,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: userId,
                    }),
                }
            )
        } catch (error) {
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Failed to leave matchmaking')
        }
    }

    /**
     * Start a new battle (deprecated - use startBotBattle or startMultiplayerBattle)
     * @deprecated Use startBotBattle() or startMultiplayerBattle() instead
     */
    async startBattle(characterUserId: string): Promise<BattleStartResponse> {
        return this.startBotBattle(characterUserId)
    }

    /**
     * Execute an attack in a battle
     */
    async executeAttack(battleId: string, moveId: string): Promise<BattleAttackResponse> {
        try {
            const { userData } = await this.getStoredAuthData()
            const userId = userData?.id

            if (!userId) {
                throw new Error('User ID is required to execute an attack')
            }

            const response = await this.makeRequestWithoutAuth<BattleAttackResponse>(
                API_CONFIG.ENDPOINTS.BATTLES.ATTACK(battleId),
                {
                    method: 'POST',
                    body: JSON.stringify({
                        move_id: moveId,
                        user_id: userId,
                    }),
                }
            )
            
            return response
        } catch (error) {
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Failed to execute attack')
        }
    }

    /**
     * End a battle and award points
     */
    async endBattle(
        battleId: string,
        winnerId: string,
        duration?: number,
        battleLog?: string[]
    ): Promise<BattleResultsResponse> {
        try {
            const { userData } = await this.getStoredAuthData()
            const userId = userData?.id

            if (!userId) {
                throw new Error('User ID is required to end a battle')
            }

            const payload: any = { winner_id: winnerId }
            if (duration !== undefined) payload.duration = duration
            if (battleLog) payload.battle_log = battleLog

            return this.makeRequestWithoutAuth<BattleResultsResponse>(
                API_CONFIG.ENDPOINTS.BATTLES.END(battleId),
                {
                    method: 'POST',
                    body: JSON.stringify(payload),
                }
            )
        } catch (error) {
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Failed to end battle')
        }
    }

    /**
     * Get user's battle history
     */
    async getBattleHistory(userId: string, limit: number = 50): Promise<BattleHistoryResponse> {
        try {
            const url = `${API_CONFIG.ENDPOINTS.BATTLES.HISTORY}?user_id=${encodeURIComponent(userId)}&limit=${limit}`
            
            return this.makeRequestWithoutAuth<BattleHistoryResponse>(
                url,
                {
                    method: 'GET',
                }
            )
        } catch (error) {
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Failed to get battle history')
        }
    }

    /**
     * Get battle details by ID
     */
    async getBattleDetails(battleId: string, userId: string): Promise<BattleDetailsResponse> {
        try {
            const url = `${API_CONFIG.ENDPOINTS.BATTLES.GET(battleId)}?user_id=${encodeURIComponent(userId)}`
            
            return this.makeRequestWithoutAuth<BattleDetailsResponse>(
                url,
                {
                    method: 'GET',
                }
            )
        } catch (error) {
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Failed to get battle details')
        }
    }

    /**
     * Ranking Methods
     */

    /**
     * Get user ranking ordered by points
     */
    async getRanking(limit: number = 100): Promise<RankingResponse> {
        try {
            const url = `${API_CONFIG.ENDPOINTS.RANKING.LIST}?limit=${limit}`
            
            return this.makeRequestWithoutAuth<RankingResponse>(
                url,
                {
                    method: 'GET',
                }
            )
        } catch (error) {
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Failed to get ranking')
        }
    }

    /**
     * Get user's position in ranking
     */
    async getUserPosition(userId: string): Promise<UserPositionResponse> {
        try {
            return this.makeRequestWithoutAuth<UserPositionResponse>(
                API_CONFIG.ENDPOINTS.RANKING.POSITION(userId),
                {
                    method: 'GET',
                }
            )
        } catch (error) {
            if (error instanceof Error) {
                throw error
            }
            throw new Error('Failed to get user position')
        }
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

