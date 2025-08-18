import { Character, CharacterProfile, CharacterStats } from '../entities/Character'

export interface CharacterRepository {
    // Basic CRUD operations
    findById(id: string): Promise<CharacterProfile | null>
    findByName(name: string): Promise<CharacterProfile | null>
    create(character: Character): Promise<CharacterProfile>
    update(id: string, updates: Partial<CharacterProfile>): Promise<CharacterProfile>
    delete(id: string): Promise<void>
    
    // Tier-based queries
    findByTier(tierId: number): Promise<CharacterProfile[]>
    getCharactersByTierRange(minTier: number, maxTier: number): Promise<CharacterProfile[]>
    
    // Stats-based queries
    findCharactersByPowerLevel(minPower: number, maxPower: number): Promise<CharacterProfile[]>
    getCharactersByStat(statName: keyof CharacterStats, minValue: number): Promise<CharacterProfile[]>
    
    // Batch operations
    getAllCharacters(): Promise<CharacterProfile[]>
    getCharactersByIds(ids: string[]): Promise<CharacterProfile[]>
    
    // Character management
    updateStats(id: string, stats: Partial<CharacterStats>): Promise<CharacterProfile>
    upgradeTier(id: string, newTierId: number): Promise<CharacterProfile>
}
