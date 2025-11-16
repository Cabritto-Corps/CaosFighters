/**
 * API Configuration for CaosFighters
 * Defines base URLs, endpoints, and timeouts for backend communication
 */

import Constants from 'expo-constants'

// Determine if we're in development mode
const isDevelopment = __DEV__

// Get API URL from environment variable or use default
const getBackendUrl = () => {
    // Check for environment variable first (from .env)
    const envApiUrl = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL

    if (envApiUrl) {
        return envApiUrl
    }

    if (isDevelopment) {
        // Choose one of the following options:

        // Option 1: For tunnel development (recommended when using Expo tunnel)
        const tunnelUrl = 'https://teodora-nirvanic-nakisha.ngrok-free.dev' // Your ngrok URL
        return `${tunnelUrl}/backend`

        // Option 2: For LAN mode (uncomment the line below and comment the lines above)
        // return 'http://192.168.215.2:8000/backend'
    }

    return 'https://your-production-url.com/backend'
}

export const API_CONFIG = {
    // Base URL switches between local and production
    BASE_URL: getBackendUrl(),

    // Request timeout in milliseconds
    TIMEOUT: 30000,

    // API Endpoints organized by feature
    ENDPOINTS: {
        // Authentication endpoints
        AUTH: {
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            LOGOUT: '/auth/logout',
            ME: '/auth/me',
            REFRESH: '/auth/refresh',
            UPDATE_PUSH_TOKEN: '/auth/update-push-token',
        },

        // User management endpoints
        USERS: {
            LIST: '/users',
            GET: (id: string) => `/users/${id}`,
            CREATE: '/users',
            UPDATE: (id: string) => `/users/${id}`,
            DELETE: (id: string) => `/users/${id}`,
        },

        // Character endpoints
        CHARACTERS: {
            LIST: '/characters',
            GET: (id: string) => `/characters/${id}`,
            BY_TIER: (tierId: number) => `/characters/tier/${tierId}`,
            CURRENT: '/characters/current',
            REGENERATE: '/characters/regenerate',
        },

        // Battle endpoints
        BATTLES: {
            START: '/battles/start',
            START_BOT: '/battles/start', // Same endpoint, but with is_multiplayer=false
            ATTACK: (battleId: string) => `/battles/${battleId}/attack`,
            END: (battleId: string) => `/battles/${battleId}/end`,
            HISTORY: '/battles/history',
            GET: (battleId: string) => `/battles/${battleId}`,
            MATCHMAKING: {
                JOIN: '/battles/matchmaking/join',
                LEAVE: '/battles/matchmaking/leave',
                STATUS: '/battles/matchmaking/status',
            },
        },

        // Location endpoints
        LOCATION: {
            UPDATE: '/location/update',
            CURRENT: '/location/current',
            HISTORY: '/location/history',
            NEARBY: '/location/nearby',
            PROXIMITY_STATUS: '/location/proximity-status',
            SAFE_SPOTS: '/location/safe-spots',
            TEST: '/location/test',
        },

        // Health check endpoints
        HEALTH: {
            CHECK: '/health/check',
            DETAILED: '/health/detailed',
            PING: '/health/ping',
        },

        // Ranking endpoints
        RANKING: {
            LIST: '/ranking',
            POSITION: (userId: string) => `/ranking/position/${userId}`,
        },

        // Notification endpoints
        NOTIFICATIONS: {
            PREFERENCES: '/notifications/preferences',
        },
    },
}

// Export helper to construct full URLs
export const getFullUrl = (endpoint: string): string => {
    return `${API_CONFIG.BASE_URL}${endpoint}`
}

