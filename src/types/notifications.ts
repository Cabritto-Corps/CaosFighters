/**
 * Notification Types for CaosFighters
 * Type definitions for notification preferences and responses
 */

/**
 * Notification preferences response
 */
export interface NotificationPreferencesResponse {
    success: boolean
    data?: {
        proximity_notifications_enabled: boolean
    }
    message?: string
    error?: string
}

/**
 * Update notification preferences request
 */
export interface UpdateNotificationPreferencesRequest {
    proximity_notifications_enabled: boolean
}

/**
 * Update notification preferences response
 */
export interface UpdateNotificationPreferencesResponse {
    success: boolean
    message: string
    data?: {
        proximity_notifications_enabled: boolean
    }
    error?: string
}

