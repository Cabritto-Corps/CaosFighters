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
    damage: number
    enemyCurrentHp: number
    turn: 'player' | 'enemy'
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
    data?: BattleState
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
