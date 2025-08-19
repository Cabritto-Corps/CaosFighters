import { CharacterProfile, CharacterStats } from '../../domain/entities/Character'
import { CharacterRepository } from '../../domain/repositories/CharacterRepository'
import { CharacterService } from '../../domain/services/CharacterService'

// Mock CharacterRepository
const mockCharacterRepository: jest.Mocked<CharacterRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findByTier: jest.fn(),
    updateStats: jest.fn(),
    upgradeTier: jest.fn(),
    findByPowerRange: jest.fn(),
}

describe('CharacterService', () => {
    let characterService: CharacterService

    beforeEach(() => {
        characterService = new CharacterService(mockCharacterRepository)
        jest.clearAllMocks()
    })

    const validStats: CharacterStats = {
        agility: 50,
        strength: 60,
        hp: 80,
        defense: 40,
        speed: 70
    }

    const mockCharacter: CharacterProfile = {
        id: 'char-123',
        tierId: 1,
        name: 'Warrior',
        stats: validStats,
        createdAt: new Date()
    }

    describe('Create Character', () => {
        it('should create character with valid data', async () => {
            mockCharacterRepository.findByName.mockResolvedValue(null)
            mockCharacterRepository.create.mockResolvedValue(mockCharacter)

            const result = await characterService.createCharacter(1, 'Warrior', validStats)

            expect(result.success).toBe(true)
            expect(result.character).toEqual(mockCharacter)
            expect(mockCharacterRepository.findByName).toHaveBeenCalledWith('Warrior')
            expect(mockCharacterRepository.create).toHaveBeenCalled()
        })

        it('should reject invalid name', async () => {
            const result = await characterService.createCharacter(1, 'W', validStats)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Invalid name')
            expect(mockCharacterRepository.create).not.toHaveBeenCalled()
        })

        it('should reject existing name', async () => {
            mockCharacterRepository.findByName.mockResolvedValue(mockCharacter)

            const result = await characterService.createCharacter(1, 'Warrior', validStats)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Character with this name already exists')
            expect(mockCharacterRepository.create).not.toHaveBeenCalled()
        })

        it('should handle repository errors', async () => {
            mockCharacterRepository.findByName.mockResolvedValue(null)
            mockCharacterRepository.create.mockRejectedValue(new Error('Database error'))

            const result = await characterService.createCharacter(1, 'Warrior', validStats)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Database error')
        })
    })

    describe('Get Character', () => {
        it('should get character by ID', async () => {
            mockCharacterRepository.findById.mockResolvedValue(mockCharacter)

            const result = await characterService.getCharacter('char-123')

            expect(result.success).toBe(true)
            expect(result.character).toEqual(mockCharacter)
            expect(mockCharacterRepository.findById).toHaveBeenCalledWith('char-123')
        })

        it('should handle character not found', async () => {
            mockCharacterRepository.findById.mockResolvedValue(null)

            const result = await characterService.getCharacter('invalid-id')

            expect(result.success).toBe(false)
            expect(result.error).toContain('Character not found')
        })
    })

    describe('Update Character Stats', () => {
        it('should update stats successfully', async () => {
            const updatedStats = { ...validStats, agility: 75 }
            const updatedCharacter = { ...mockCharacter, stats: updatedStats }

            mockCharacterRepository.findById.mockResolvedValue(mockCharacter)
            mockCharacterRepository.updateStats.mockResolvedValue(updatedCharacter)

            const result = await characterService.updateCharacterStats('char-123', { agility: 75 })

            expect(result.success).toBe(true)
            expect(result.character?.stats.agility).toBe(75)
            expect(mockCharacterRepository.updateStats).toHaveBeenCalledWith('char-123', { agility: 75 })
        })

        it('should handle character not found', async () => {
            mockCharacterRepository.findById.mockResolvedValue(null)

            const result = await characterService.updateCharacterStats('invalid-id', { agility: 75 })

            expect(result.success).toBe(false)
            expect(result.error).toContain('Character not found')
            expect(mockCharacterRepository.updateStats).not.toHaveBeenCalled()
        })
    })

    describe('Upgrade Character Tier', () => {
        it('should upgrade tier successfully', async () => {
            const upgradedCharacter = { ...mockCharacter, tierId: 2 }

            mockCharacterRepository.findById.mockResolvedValue(mockCharacter)
            mockCharacterRepository.upgradeTier.mockResolvedValue(upgradedCharacter)

            const result = await characterService.upgradeCharacterTier('char-123', 2)

            expect(result.success).toBe(true)
            expect(result.character?.tierId).toBe(2)
            expect(mockCharacterRepository.upgradeTier).toHaveBeenCalledWith('char-123', 2)
        })

        it('should reject invalid tier upgrade', async () => {
            mockCharacterRepository.findById.mockResolvedValue(mockCharacter)

            const result = await characterService.upgradeCharacterTier('char-123', 1) // Same tier

            expect(result.success).toBe(false)
            expect(result.error).toContain('New tier must be higher than current tier')
            expect(mockCharacterRepository.upgradeTier).not.toHaveBeenCalled()
        })
    })

    describe('Delete Character', () => {
        it('should delete character successfully', async () => {
            mockCharacterRepository.findById.mockResolvedValue(mockCharacter)
            mockCharacterRepository.delete.mockResolvedValue()

            const result = await characterService.deleteCharacter('char-123')

            expect(result.success).toBe(true)
            expect(mockCharacterRepository.delete).toHaveBeenCalledWith('char-123')
        })

        it('should handle character not found', async () => {
            mockCharacterRepository.findById.mockResolvedValue(null)

            const result = await characterService.deleteCharacter('invalid-id')

            expect(result.success).toBe(false)
            expect(result.error).toContain('Character not found')
            expect(mockCharacterRepository.delete).not.toHaveBeenCalled()
        })
    })

    describe('List Characters', () => {
        it('should get all characters', async () => {
            const characters = [mockCharacter]
            mockCharacterRepository.findAll.mockResolvedValue(characters)

            const result = await characterService.getAllCharacters()

            expect(result.success).toBe(true)
            expect(result.characters).toEqual(characters)
            expect(mockCharacterRepository.findAll).toHaveBeenCalled()
        })

        it('should get characters by tier', async () => {
            const characters = [mockCharacter]
            mockCharacterRepository.findByTier.mockResolvedValue(characters)

            const result = await characterService.getCharactersByTier(1)

            expect(result.success).toBe(true)
            expect(result.characters).toEqual(characters)
            expect(mockCharacterRepository.findByTier).toHaveBeenCalledWith(1)
        })

        it('should search characters by power range', async () => {
            const characters = [mockCharacter]
            mockCharacterRepository.findByPowerRange.mockResolvedValue(characters)

            const result = await characterService.searchCharactersByPower(200, 400)

            expect(result.success).toBe(true)
            expect(result.characters).toEqual(characters)
            expect(mockCharacterRepository.findByPowerRange).toHaveBeenCalledWith(200, 400)
        })
    })
})
