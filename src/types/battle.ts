import type { UserCharacter, CharacterMove } from './character'

export interface BattleParticipant {
    userId: string
    character: UserCharacter
    currentHp: number
    maxHp: number
}

export interface BattleAction {
    moveId: string
    moveName: string
    targetHp: number
    damageDealt: number
    type: 'attack' | 'defend' | 'item'
}

export interface BattleState {
    id: string
    playerCharacterUserId: string
    enemyCharacterUserId: string
    playerCurrentHp: number
    playerMaxHp: number
    enemyCurrentHp: number
    enemyMaxHp: number
    turn: 'player' | 'enemy'
    battleLog: BattleAction[]
    isFinished: boolean
    winner?: 'player' | 'enemy'
    startedAt: string
}

export interface BattleAttackRequest {
    battleId: string
    moveId: string
    characterUserId: string
}

export interface BattleAttackResponse {
    success: boolean
    data?: {
        damage: number
        enemy_current_hp: number
        turn: 'player' | 'enemy'
        is_finished?: boolean
        winner_id?: string
        move_name?: string
        message?: string
    }
    damage?: number
    enemyCurrentHp?: number
    turn?: 'player' | 'enemy'
    isFinished?: boolean
    winner?: string
    message?: string
    error?: string
}

export interface BattleStartRequest {
    characterUserId: string
    opponentType: 'bot' | 'player'
    opponentId?: string
}

export interface BattleStartResponse {
    success: boolean
    data?: {
        battle_id: string
        player_id: string  // Actual user ID for winner validation
        player_character: {
            character_user_id: string
            character: {
                id: string
                name: string
                form_id: string
                image_url: string
                tier: any
            }
            status: {
                hp: number
                strength: number
                defense: number
                agility: number
            }
            moves: any[]
        }
        bot_character: {
            character_id: string
            character: {
                id: string
                name: string
                form_id: string
                image_url: string
                tier: any
            }
            status: {
                hp: number
                strength: number
                defense: number
                agility: number
            }
            moves: any[]
        }
        turn: 'player' | 'enemy'
    }
    message?: string
    error?: string
}

export interface BattleResultsResponse {
    success: boolean
    pointsAwarded?: number
    experienceGained?: number
    itemsDropped?: any[]
    message?: string
    error?: string
}

export interface BattleHistoryCharacter {
    id: string
    name: string
    form_id: number
    tier: {
        id: number
        name: string
    } | null
}

export interface BattleLogEntry {
    attacker_id?: string
    move_id?: string
    move_name?: string
    damage?: number
    timestamp?: string
    type?: 'attack' | 'start' | 'end' | 'message'
    message?: string
    attacker_name?: string
    target_name?: string
}

export type BattleLog = BattleLogEntry[] | string[]

export interface BattleHistoryItem {
    id: string
    opponent: {
        id: string
        name: string
    }
    opponent_character: BattleHistoryCharacter
    user_character: BattleHistoryCharacter
    winner_id: string
    is_winner: boolean
    points_awarded?: number | null
    battle_timestamp: string
    duration: string | null
    battle_log?: BattleLog
}

export interface BattleHistoryResponse {
    success: boolean
    data?: BattleHistoryItem[]
    message?: string
    error?: string
}

export interface BattleDetailsResponse {
    success: boolean
    data?: BattleHistoryItem
    message?: string
    error?: string
}

// Multiplayer types
export type BattleMode = 'bot' | 'multiplayer'

export interface WebSocketMessage {
    type: 'match_found' | 'battle_attack' | 'battle_state_update' | 'battle_end' | 'error' | 'matchmaking_queued'
    data?: any
    battle_id?: string
    message?: string
}

export interface MatchFoundData {
    battle_id: string
    opponent: {
        id: string
        name: string
        character: {
            id: string
            name: string
            image_url: string
        }
        status: {
            hp: number
            strength: number
            defense: number
            agility: number
        }
        moves: any[]
    }
    player_character: {
        character_user_id: string
        character: {
            id: string
            name: string
            image_url: string
        }
        status: {
            hp: number
            strength: number
            defense: number
            agility: number
        }
        moves: any[]
    }
    turn: 'player' | 'enemy'
}

export interface BattleAttackWebSocketData {
    battle_id: string
    attacker_id: string
    move_id: string
    move_name: string
    damage: number
    target_hp: number
    turn: 'player' | 'enemy'
    battle_ended?: boolean
    winner_id?: string
}

export interface MatchmakingJoinRequest {
    character_user_id: string
    user_id: string
}

export interface MatchmakingJoinResponse {
    success: boolean
    message?: string
    error?: string
    queue_position?: number
}

export interface MatchmakingStatusResponse {
    success: boolean
    data?: {
        match_found: boolean
        battle?: MatchFoundData
    }
    message?: string | null
    error?: string
}