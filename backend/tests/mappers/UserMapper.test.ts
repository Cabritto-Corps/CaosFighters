import { UserMapper } from '../../infra/mappers/UserMapper'

describe('UserMapper', () => {
    let mapper: UserMapper

    beforeEach(() => {
        mapper = new UserMapper()
    })

    const mockDatabaseUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        points: 100,
        ranking: 5,
        status: 'active' as const,
        created_at: '2024-01-01T00:00:00.000Z'
    }

    const mockDomainUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        points: 100,
        ranking: 5,
        status: 'active' as const,
        createdAt: new Date('2024-01-01T00:00:00.000Z')
    }

    describe('toDomain', () => {
        it('should map database user to domain user', () => {
            const result = mapper.toDomain(mockDatabaseUser)

            expect(result).toEqual(mockDomainUser)
            expect(result.createdAt).toBeInstanceOf(Date)
        })

        it('should handle null ranking', () => {
            const dbUser = { ...mockDatabaseUser, ranking: null }
            const result = mapper.toDomain(dbUser)

            expect(result.ranking).toBeNull()
        })

        it('should handle different status values', () => {
            const statuses = ['active', 'inactive', 'pending'] as const
            
            statuses.forEach(status => {
                const dbUser = { ...mockDatabaseUser, status }
                const result = mapper.toDomain(dbUser)
                expect(result.status).toBe(status)
            })
        })
    })

    describe('toDatabase', () => {
        it('should map domain user to database user', () => {
            const result = mapper.toDatabase(mockDomainUser)

            expect(result).toEqual({
                name: 'John Doe',
                email: 'john@example.com',
                points: 100,
                ranking: 5,
                status: 'active'
            })
        })

        it('should handle partial domain user updates', () => {
            const partialUser = {
                points: 150,
                ranking: 3
            }

            const result = mapper.toDatabase(partialUser as any)

            expect(result.points).toBe(150)
            expect(result.ranking).toBe(3)
            expect(result.id).toBeUndefined()
        })
    })

    describe('toDomainList', () => {
        it('should map array of database users to domain users', () => {
            const dbUsers = [
                mockDatabaseUser,
                { ...mockDatabaseUser, id: 'user-456', name: 'Jane Doe' }
            ]

            const result = mapper.toDomainList(dbUsers)

            expect(result).toHaveLength(2)
            expect(result[0]?.id).toBe('user-123')
            expect(result[1]?.id).toBe('user-456')
            expect(result[1]?.name).toBe('Jane Doe')
        })

        it('should handle empty array', () => {
            const result = mapper.toDomainList([])
            expect(result).toEqual([])
        })
    })
})
