/**
 * API Configuration for CaosFighters
 * Defines base URLs, endpoints, and timeouts for backend communication
 */

// Determine if we're in development mode
const isDevelopment = __DEV__

export const API_CONFIG = {
    // Base URL switches between local and production
    BASE_URL: isDevelopment
        ? 'http://192.168.1.8:8000/backend' // Local Laravel development server
        : 'https://your-production-url.com/backend', // Update this for production

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

