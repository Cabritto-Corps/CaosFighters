import { UserProfile } from '../../domain/entities/User'

export interface DatabaseUser {
    id: string
    name: string
    email: string
    points: number
    ranking: number | null
    status: 'active' | 'inactive' | 'pending'
    created_at: string
}

export class UserMapper {
    toDomain(dbUser: DatabaseUser): UserProfile {
        return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            points: dbUser.points,
            ranking: dbUser.ranking,
            status: dbUser.status,
            createdAt: new Date(dbUser.created_at)
        }
    }

    toDatabase(domainUser: Partial<UserProfile>): Partial<DatabaseUser> {
        const dbUser: Partial<DatabaseUser> = {}

        if (domainUser.name !== undefined) dbUser.name = domainUser.name
        if (domainUser.email !== undefined) dbUser.email = domainUser.email
        if (domainUser.points !== undefined) dbUser.points = domainUser.points
        if (domainUser.ranking !== undefined) dbUser.ranking = domainUser.ranking
        if (domainUser.status !== undefined) dbUser.status = domainUser.status

        return dbUser
    }

    toDomainList(dbUsers: DatabaseUser[]): UserProfile[] {
        return dbUsers.map(user => this.toDomain(user))
    }
}
