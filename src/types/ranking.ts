/**
 * Ranking Types for CaosFighters
 * Type definitions for user ranking system
 */

export interface RankingUser {
    rank: number
    id: string
    name: string
    points: number
}

export interface RankingResponse {
    success: boolean
    data?: RankingUser[]
    count?: number
    message?: string
    error?: string
}

export interface UserPositionResponse {
    success: boolean
    data?: {
        user_id: string
        name: string
        points: number
        position: number
    }
    message?: string
    error?: string
}

