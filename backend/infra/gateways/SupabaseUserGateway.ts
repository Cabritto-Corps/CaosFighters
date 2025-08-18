import { supabase } from '../supabase/client'
import { UserRepository } from '../../domain/repositories/UserRepository'
import { UserProfile, UserCredentials, UserRegistration } from '../../domain/entities/User'
import { UserMapper } from '../mappers/UserMapper'

export class SupabaseUserGateway implements UserRepository {
    private userMapper: UserMapper

    constructor() {
        this.userMapper = new UserMapper()
    }

    async signUp(userData: UserRegistration): Promise<UserProfile> {
        try {
            // First, create the user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        name: userData.name
                    }
                }
            })

            if (authError) {
                throw new Error(`Authentication error: ${authError.message}`)
            }

            if (!authData.user) {
                throw new Error('Failed to create user account')
            }

            // Create user profile in the users table
            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    name: userData.name,
                    email: userData.email,
                    points: 0,
                    status: 'active'
                })
                .select()
                .single()

            if (profileError) {
                throw new Error(`Profile creation error: ${profileError.message}`)
            }

            return this.userMapper.toDomain(profileData)
        } catch (error) {
            throw new Error(`Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async signIn(credentials: UserCredentials): Promise<UserProfile> {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
            })

            if (error) {
                throw new Error(`Sign in failed: ${error.message}`)
            }

            if (!data.user) {
                throw new Error('No user data returned')
            }

            // Get user profile from the users table
            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single()

            if (profileError) {
                throw new Error(`Profile fetch error: ${profileError.message}`)
            }

            return this.userMapper.toDomain(profileData)
        } catch (error) {
            throw new Error(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async signOut(): Promise<void> {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) {
                throw new Error(`Sign out failed: ${error.message}`)
            }
        } catch (error) {
            throw new Error(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findById(id: string): Promise<UserProfile | null> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return null // User not found
                }
                throw new Error(`Database error: ${error.message}`)
            }

            return this.userMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Find user failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async findByEmail(email: string): Promise<UserProfile | null> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return null // User not found
                }
                throw new Error(`Database error: ${error.message}`)
            }

            return this.userMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Find user by email failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async updateProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
        try {
            const { data, error } = await supabase
                .from('users')
                .update(this.userMapper.toDatabase(updates))
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`Update failed: ${error.message}`)
            }

            return this.userMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Update profile failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async deleteUser(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id)

            if (error) {
                throw new Error(`Delete failed: ${error.message}`)
            }
        } catch (error) {
            throw new Error(`Delete user failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async updatePoints(id: string, points: number): Promise<UserProfile> {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({ points })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`Update points failed: ${error.message}`)
            }

            return this.userMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Update points failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async updateRanking(id: string, ranking: number | null): Promise<UserProfile> {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({ ranking })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`Update ranking failed: ${error.message}`)
            }

            return this.userMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Update ranking failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async updateStatus(id: string, status: 'active' | 'inactive' | 'pending'): Promise<UserProfile> {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({ status })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new Error(`Update status failed: ${error.message}`)
            }

            return this.userMapper.toDomain(data)
        } catch (error) {
            throw new Error(`Update status failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async getTopPlayers(limit: number): Promise<UserProfile[]> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('points', { ascending: false })
                .limit(limit)

            if (error) {
                throw new Error(`Get top players failed: ${error.message}`)
            }

            return data.map(user => this.userMapper.toDomain(user))
        } catch (error) {
            throw new Error(`Get top players failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async getUsersByStatus(status: 'active' | 'inactive' | 'pending'): Promise<UserProfile[]> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('status', status)

            if (error) {
                throw new Error(`Get users by status failed: ${error.message}`)
            }

            return data.map(user => this.userMapper.toDomain(user))
        } catch (error) {
            throw new Error(`Get users by status failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}
