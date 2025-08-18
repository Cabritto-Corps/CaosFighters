import { UserProfile, UserCredentials, UserRegistration } from '../entities/User'

export interface UserRepository {
    // Authentication methods
    signUp(userData: UserRegistration): Promise<UserProfile>
    signIn(credentials: UserCredentials): Promise<UserProfile>
    signOut(): Promise<void>
    
    // User management
    findById(id: string): Promise<UserProfile | null>
    findByEmail(email: string): Promise<UserProfile | null>
    updateProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile>
    deleteUser(id: string): Promise<void>
    
    // Points and ranking
    updatePoints(id: string, points: number): Promise<UserProfile>
    updateRanking(id: string, ranking: number | null): Promise<UserProfile>
    
    // User status
    updateStatus(id: string, status: 'active' | 'inactive' | 'pending'): Promise<UserProfile>
    
    // Batch operations
    getTopPlayers(limit: number): Promise<UserProfile[]>
    getUsersByStatus(status: 'active' | 'inactive' | 'pending'): Promise<UserProfile[]>
}
