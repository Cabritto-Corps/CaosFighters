import { Battle, BattleState, BattleStatus } from '../entities/Battle'

export interface BattleRepository {
    // Basic CRUD operations
    findById(id: string): Promise<BattleState | null>
    create(battle: Battle): Promise<BattleState>
    update(id: string, updates: Partial<BattleState>): Promise<BattleState>
    delete(id: string): Promise<void>
    
    // Battle state management
    startBattle(id: string): Promise<BattleState>
    endBattle(id: string, winnerId: string): Promise<BattleState>
    cancelBattle(id: string): Promise<BattleState>
    
    // Player-related queries
    findBattlesByPlayer(userId: string): Promise<BattleState[]>
    findActiveBattlesByPlayer(userId: string): Promise<BattleState[]>
    findCompletedBattlesByPlayer(userId: string): Promise<BattleState[]>
    
    // Battle status queries
    findBattlesByStatus(status: BattleStatus): Promise<BattleState[]>
    findActiveBattles(): Promise<BattleState[]>
    findPendingBattles(): Promise<BattleState[]>
    
    // Battle history and statistics
    getBattleHistory(userId: string, limit?: number): Promise<BattleState[]>
    getBattleStatistics(userId: string): Promise<{
        totalBattles: number
        wins: number
        losses: number
        winRate: number
        averageDuration: number
    }>
    
    // Matchmaking
    findAvailableBattles(userId: string, characterId: string): Promise<BattleState[]>
    findBattlesByCharacter(characterId: string): Promise<BattleState[]>
}
