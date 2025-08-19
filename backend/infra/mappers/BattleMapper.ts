import { BattleParticipant, BattleState, BattleStatus } from '../../domain/entities/Battle'

export interface DatabaseBattle {
    id: string
    player1_id: string
    player2_id: string
    character1_id: string
    character2_id: string
    player1_current_hp: number
    player2_current_hp: number
    player1_max_hp: number
    player2_max_hp: number
    player1_alive: boolean
    player2_alive: boolean
    winner_id: string | null
    current_turn: string | null
    status: BattleStatus
    duration: number | null
    battle_timestamp: string
    created_at: string
}

export class BattleMapper {
    toDomain(dbBattle: DatabaseBattle): BattleState {
        const player1: BattleParticipant = {
            userId: dbBattle.player1_id,
            characterId: dbBattle.character1_id,
            currentHp: dbBattle.player1_current_hp,
            maxHp: dbBattle.player1_max_hp,
            isAlive: dbBattle.player1_alive
        }

        const player2: BattleParticipant = {
            userId: dbBattle.player2_id,
            characterId: dbBattle.character2_id,
            currentHp: dbBattle.player2_current_hp,
            maxHp: dbBattle.player2_max_hp,
            isAlive: dbBattle.player2_alive
        }

        return {
            id: dbBattle.id,
            player1,
            player2,
            winnerId: dbBattle.winner_id,
            currentTurn: dbBattle.current_turn,
            status: dbBattle.status,
            duration: dbBattle.duration,
            battleTimestamp: new Date(dbBattle.battle_timestamp),
            createdAt: new Date(dbBattle.created_at)
        }
    }

    toDatabase(domainBattle: Partial<BattleState>): Partial<DatabaseBattle> {
        const dbBattle: Partial<DatabaseBattle> = {}

        if (domainBattle.id !== undefined) dbBattle.id = domainBattle.id
        if (domainBattle.winnerId !== undefined) dbBattle.winner_id = domainBattle.winnerId
        if (domainBattle.currentTurn !== undefined) dbBattle.current_turn = domainBattle.currentTurn
        if (domainBattle.status !== undefined) dbBattle.status = domainBattle.status
        if (domainBattle.duration !== undefined) dbBattle.duration = domainBattle.duration

        if (domainBattle.player1) {
            dbBattle.player1_id = domainBattle.player1.userId
            dbBattle.character1_id = domainBattle.player1.characterId
            dbBattle.player1_current_hp = domainBattle.player1.currentHp
            dbBattle.player1_max_hp = domainBattle.player1.maxHp
            dbBattle.player1_alive = domainBattle.player1.isAlive
        }

        if (domainBattle.player2) {
            dbBattle.player2_id = domainBattle.player2.userId
            dbBattle.character2_id = domainBattle.player2.characterId
            dbBattle.player2_current_hp = domainBattle.player2.currentHp
            dbBattle.player2_max_hp = domainBattle.player2.maxHp
            dbBattle.player2_alive = domainBattle.player2.isAlive
        }

        if (domainBattle.battleTimestamp) {
            dbBattle.battle_timestamp = domainBattle.battleTimestamp.toISOString()
        }

        return dbBattle
    }

    toDomainList(dbBattles: DatabaseBattle[]): BattleState[] {
        return dbBattles.map(battle => this.toDomain(battle))
    }
}
