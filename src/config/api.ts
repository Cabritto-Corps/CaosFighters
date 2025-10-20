/**
 * API Configuration for CaosFighters
 * Defines base URLs, endpoints, and timeouts for backend communication
 */

// Determine if we're in development mode
const isDevelopment = __DEV__

// Environment-specific configuration
const getBackendUrl = () => {
    if (isDevelopment) {
        // Choose one of the following options:

        // Option 1: For tunnel development (recommended when using Expo tunnel)
        const tunnelUrl = 'https://giselle-snippier-coralee.ngrok-free.dev' // Your ngrok URL
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
    TIMEOUT: 10000,

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
    },
}

// Export helper to construct full URLs
export const getFullUrl = (endpoint: string): string => {
    return `${API_CONFIG.BASE_URL}${endpoint}`
}

