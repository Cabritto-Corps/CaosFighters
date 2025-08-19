import { Character, CharacterProfile, CharacterStats } from '../../domain/entities/Character'
import { CharacterRepository } from '../../domain/repositories/CharacterRepository'
import { CharacterMapper } from '../mappers/CharacterMapper'
import { supabase } from '../supabase/client'

export class SupabaseCharacterGateway implements CharacterRepository {
    private characterMapper: CharacterMapper

    constructor() {
        this.characterMapper = new CharacterMapper()
    }

    async findById(id: string): Promise<CharacterProfile | null> {
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return null // Character not found
                }
                throw new Error(`Database error: ${error.message}`)
            }

            return this.characterMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Find character failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findByName(name: string): Promise<CharacterProfile | null> {
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .eq('name', name)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return null // Character not found
                }
                throw new Error(`Database error: ${error.message}`)
            }

            return this.characterMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Find character by name failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async create(character: Character): Promise<CharacterProfile> {
        try {
            const characterData = this.characterMapper.toDatabase(character.toJSON())

            const { data, error } = await supabase
                .from('characters')
                .insert(characterData)
                .select()
                .single()

            if (error) {
                throw new Error(`Character creation failed: ${error.message}`)
            }

            return this.characterMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Create character failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async update(id: string, updates: Partial<CharacterProfile>): Promise<CharacterProfile> {
        try {
            const updateData = this.characterMapper.toDatabase(updates)

            const { data, error } = await supabase
                .from('characters')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`Update failed: ${error.message}`)
            }

            return this.characterMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Update character failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async delete(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('characters')
                .delete()
                .eq('id', id)

            if (error) {
                throw new Error(`Delete failed: ${error.message}`)
            }
        } catch (error) {
            throw new Error(`Delete character failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findByTier(tierId: number): Promise<CharacterProfile[]> {
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .eq('tier_id', tierId)

            if (error) {
                throw new Error(`Get characters by tier failed: ${error.message}`)
            }

            return data.map(character => this.characterMapper.toDomain(character))
        } catch (error) {
            throw new Error(`Find characters by tier failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async getCharactersByTierRange(minTier: number, maxTier: number): Promise<CharacterProfile[]> {
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .gte('tier_id', minTier)
                .lte('tier_id', maxTier)

            if (error) {
                throw new Error(`Get characters by tier range failed: ${error.message}`)
            }

            return data.map(character => this.characterMapper.toDomain(character))
        } catch (error) {
            throw new Error(`Find characters by tier range failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findCharactersByPowerLevel(minPower: number, maxPower: number): Promise<CharacterProfile[]> {
        try {
            // Calculate power level using SQL expression
            const { data, error } = await supabase
                .rpc('get_characters_by_power_level', {
                    min_power: minPower,
                    max_power: maxPower
                })

            if (error) {
                throw new Error(`Get characters by power level failed: ${error.message}`)
            }

            return data.map((character: any) => this.characterMapper.toDomain(character))
        } catch (error) {
            throw new Error(`Find characters by power level failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async getCharactersByStat(statName: keyof CharacterStats, minValue: number): Promise<CharacterProfile[]> {
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .gte(statName, minValue)

            if (error) {
                throw new Error(`Get characters by stat failed: ${error.message}`)
            }

            return data.map(character => this.characterMapper.toDomain(character))
        } catch (error) {
            throw new Error(`Find characters by stat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async getAllCharacters(): Promise<CharacterProfile[]> {
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                throw new Error(`Get all characters failed: ${error.message}`)
            }

            return data.map(character => this.characterMapper.toDomain(character))
        } catch (error) {
            throw new Error(`Get all characters failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async getCharactersByIds(ids: string[]): Promise<CharacterProfile[]> {
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .in('id', ids)

            if (error) {
                throw new Error(`Get characters by IDs failed: ${error.message}`)
            }

            return data.map(character => this.characterMapper.toDomain(character))
        } catch (error) {
            throw new Error(`Get characters by IDs failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async updateStats(id: string, stats: Partial<CharacterStats>): Promise<CharacterProfile> {
        try {
            const updateData: any = {}
            if (stats.agility !== undefined) updateData.agility = stats.agility
            if (stats.strength !== undefined) updateData.strength = stats.strength
            if (stats.hp !== undefined) updateData.hp = stats.hp
            if (stats.defense !== undefined) updateData.defense = stats.defense
            if (stats.speed !== undefined) updateData.speed = stats.speed

            const { data, error } = await supabase
                .from('characters')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`Update stats failed: ${error.message}`)
            }

            return this.characterMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Update character stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async upgradeTier(id: string, newTierId: number): Promise<CharacterProfile> {
        try {
            const { data, error } = await supabase
                .from('characters')
                .update({ tier_id: newTierId })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`Upgrade tier failed: ${error.message}`)
            }

            return this.characterMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Upgrade character tier failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}
