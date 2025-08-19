import { Character, CharacterProfile, CharacterStats } from '../entities/Character'
import { CharacterRepository } from '../repositories/CharacterRepository'

export interface CharacterResult {
    success: boolean
    character?: CharacterProfile
    characters?: CharacterProfile[]
    error?: string
}

export class CharacterService {
    private characterRepository: CharacterRepository

    constructor(characterRepository: CharacterRepository) {
        this.characterRepository = characterRepository
    }

    async createCharacter(tierId: number, name: string, stats: CharacterStats): Promise<CharacterResult> {
        try {
            // Validate character name
            if (!Character.validateName(name)) {
                return {
                    success: false,
                    error: 'Invalid name: must be between 2 and 30 characters'
                }
            }

            // Check if character name already exists
            const existingCharacter = await this.characterRepository.findByName(name)
            if (existingCharacter) {
                return {
                    success: false,
                    error: 'Character with this name already exists'
                }
            }

            // Validate tier
            if (tierId < 1 || tierId > 10) {
                return {
                    success: false,
                    error: 'Tier must be between 1 and 10'
                }
            }

            // Create character
            const character = Character.create(tierId, name, stats)
            const createdCharacter = await this.characterRepository.create(character)

            return {
                success: true,
                character: createdCharacter
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Character creation failed'
            }
        }
    }

    async getCharacter(id: string): Promise<CharacterResult> {
        try {
            const character = await this.characterRepository.findById(id)

            if (!character) {
                return {
                    success: false,
                    error: 'Character not found'
                }
            }

            return {
                success: true,
                character
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get character'
            }
        }
    }

    async updateCharacterStats(id: string, statsUpdate: Partial<CharacterStats>): Promise<CharacterResult> {
        try {
            // Validate stats if provided
            const validatedStats: Partial<CharacterStats> = {}

            if (statsUpdate.agility !== undefined) {
                if (statsUpdate.agility < 0 || statsUpdate.agility > 100) {
                    return { success: false, error: 'Agility must be between 0 and 100' }
                }
                validatedStats.agility = statsUpdate.agility
            }

            if (statsUpdate.strength !== undefined) {
                if (statsUpdate.strength < 0 || statsUpdate.strength > 100) {
                    return { success: false, error: 'Strength must be between 0 and 100' }
                }
                validatedStats.strength = statsUpdate.strength
            }

            if (statsUpdate.hp !== undefined) {
                if (statsUpdate.hp < 0 || statsUpdate.hp > 100) {
                    return { success: false, error: 'HP must be between 0 and 100' }
                }
                validatedStats.hp = statsUpdate.hp
            }

            if (statsUpdate.defense !== undefined) {
                if (statsUpdate.defense < 0 || statsUpdate.defense > 100) {
                    return { success: false, error: 'Defense must be between 0 and 100' }
                }
                validatedStats.defense = statsUpdate.defense
            }

            if (statsUpdate.speed !== undefined) {
                if (statsUpdate.speed < 0 || statsUpdate.speed > 100) {
                    return { success: false, error: 'Speed must be between 0 and 100' }
                }
                validatedStats.speed = statsUpdate.speed
            }

            const updatedCharacter = await this.characterRepository.updateStats(id, validatedStats)

            return {
                success: true,
                character: updatedCharacter
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update character stats'
            }
        }
    }

    async upgradeCharacterTier(id: string, newTierId: number): Promise<CharacterResult> {
        try {
            // Validate new tier
            if (newTierId < 1 || newTierId > 10) {
                return {
                    success: false,
                    error: 'Tier must be between 1 and 10'
                }
            }

            // Get current character to validate upgrade
            const currentCharacter = await this.characterRepository.findById(id)
            if (!currentCharacter) {
                return {
                    success: false,
                    error: 'Character not found'
                }
            }

            if (newTierId <= currentCharacter.tierId) {
                return {
                    success: false,
                    error: 'New tier must be higher than current tier'
                }
            }

            const upgradedCharacter = await this.characterRepository.upgradeTier(id, newTierId)

            return {
                success: true,
                character: upgradedCharacter
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upgrade character tier'
            }
        }
    }

    async getCharactersByTier(tierId: number): Promise<CharacterResult> {
        try {
            if (tierId < 1 || tierId > 10) {
                return {
                    success: false,
                    error: 'Tier must be between 1 and 10'
                }
            }

            const characters = await this.characterRepository.findByTier(tierId)

            return {
                success: true,
                characters
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get characters by tier'
            }
        }
    }

    async getAllCharacters(): Promise<CharacterResult> {
        try {
            const characters = await this.characterRepository.getAllCharacters()

            return {
                success: true,
                characters
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get characters'
            }
        }
    }

    async deleteCharacter(id: string): Promise<CharacterResult> {
        try {
            // Check if character exists
            const character = await this.characterRepository.findById(id)
            if (!character) {
                return {
                    success: false,
                    error: 'Character not found'
                }
            }

            await this.characterRepository.delete(id)

            return {
                success: true
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete character'
            }
        }
    }

    async searchCharactersByPowerLevel(minPower: number, maxPower: number): Promise<CharacterResult> {
        try {
            if (minPower < 0 || maxPower < 0 || minPower > maxPower) {
                return {
                    success: false,
                    error: 'Invalid power level range'
                }
            }

            const characters = await this.characterRepository.findCharactersByPowerLevel(minPower, maxPower)

            return {
                success: true,
                characters
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search characters by power level'
            }
        }
    }
}
