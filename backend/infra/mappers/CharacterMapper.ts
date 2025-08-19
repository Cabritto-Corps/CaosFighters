import { CharacterProfile, CharacterStats } from '../../domain/entities/Character'

export interface DatabaseCharacter {
    id: string
    tier_id: number
    name: string
    agility: number
    strength: number
    hp: number
    defense: number
    speed: number
    created_at: string
}

export class CharacterMapper {
    toDomain(dbCharacter: DatabaseCharacter): CharacterProfile {
        const stats: CharacterStats = {
            agility: dbCharacter.agility,
            strength: dbCharacter.strength,
            hp: dbCharacter.hp,
            defense: dbCharacter.defense,
            speed: dbCharacter.speed
        }

        return {
            id: dbCharacter.id,
            tierId: dbCharacter.tier_id,
            name: dbCharacter.name,
            stats,
            createdAt: new Date(dbCharacter.created_at)
        }
    }

    toDatabase(domainCharacter: Partial<CharacterProfile>): Partial<DatabaseCharacter> {
        const dbCharacter: Partial<DatabaseCharacter> = {}

        if (domainCharacter.id !== undefined) dbCharacter.id = domainCharacter.id
        if (domainCharacter.tierId !== undefined) dbCharacter.tier_id = domainCharacter.tierId
        if (domainCharacter.name !== undefined) dbCharacter.name = domainCharacter.name

        if (domainCharacter.stats) {
            if (domainCharacter.stats.agility !== undefined) dbCharacter.agility = domainCharacter.stats.agility
            if (domainCharacter.stats.strength !== undefined) dbCharacter.strength = domainCharacter.stats.strength
            if (domainCharacter.stats.hp !== undefined) dbCharacter.hp = domainCharacter.stats.hp
            if (domainCharacter.stats.defense !== undefined) dbCharacter.defense = domainCharacter.stats.defense
            if (domainCharacter.stats.speed !== undefined) dbCharacter.speed = domainCharacter.stats.speed
        }

        return dbCharacter
    }

    toDomainList(dbCharacters: DatabaseCharacter[]): CharacterProfile[] {
        return dbCharacters.map(character => this.toDomain(character))
    }
}
