import { UserLocation } from '../entities/Location'
import { BattleService } from './BattleService'
import { CharacterService } from './CharacterService'
import { LocationService } from './LocationService'

export interface BattleInvitation {
    id: string
    fromUserId: string
    toUserId: string
    fromCharacterId: string
    toCharacterId: string
    status: 'pending' | 'accepted' | 'declined' | 'expired'
    expiresAt: Date
    createdAt: Date
}

export interface MatchmakingResult {
    success: boolean
    nearbyUsers?: UserLocation[]
    invitation?: BattleInvitation
    invitations?: BattleInvitation[]
    battle?: any
    error?: string
}

export class MatchmakingService {
    private locationService: LocationService
    private battleService: BattleService
    private characterService: CharacterService
    private activeInvitations: Map<string, BattleInvitation> = new Map()

    constructor(locationService: LocationService, battleService: BattleService, characterService: CharacterService) {
        this.locationService = locationService
        this.battleService = battleService
        this.characterService = characterService
    }

    async findNearbyOpponents(userId: string, characterId: string, radiusKm: number = 0.1): Promise<MatchmakingResult> {
        try {
            // Get user's character to check tier compatibility
            const characterResult = await this.characterService.getCharacter(characterId)
            if (!characterResult.success || !characterResult.character) {
                return {
                    success: false,
                    error: 'Character not found'
                }
            }

            // Find nearby users
            const nearbyResult = await this.locationService.findNearbyUsers(userId, radiusKm)
            if (!nearbyResult.success || !nearbyResult.nearbyUsers) {
                return {
                    success: false,
                    error: nearbyResult.error || 'No nearby users found'
                }
            }

            // Filter users by character tier compatibility (±1 tier difference)
            const compatibleUsers: UserLocation[] = []
            for (const nearbyUser of nearbyResult.nearbyUsers) {
                // Here we would check the user's active character tier
                // For now, we'll include all nearby users
                compatibleUsers.push(nearbyUser)
            }

            return {
                success: true,
                nearbyUsers: compatibleUsers
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to find nearby opponents'
            }
        }
    }

    async sendBattleInvitation(fromUserId: string, toUserId: string, fromCharacterId: string, toCharacterId: string): Promise<MatchmakingResult> {
        try {
            // Validate that users are still nearby
            const nearbyResult = await this.locationService.findNearbyUsers(fromUserId)
            if (!nearbyResult.success || !nearbyResult.nearbyUsers) {
                return {
                    success: false,
                    error: 'Target user is no longer nearby'
                }
            }

            const isTargetNearby = nearbyResult.nearbyUsers.some(user => user.userId === toUserId)
            if (!isTargetNearby) {
                return {
                    success: false,
                    error: 'Target user is no longer in range'
                }
            }

            // Check if either user already has pending invitations
            const existingInvitation = Array.from(this.activeInvitations.values())
                .find(inv =>
                    (inv.fromUserId === fromUserId || inv.toUserId === fromUserId ||
                        inv.fromUserId === toUserId || inv.toUserId === toUserId) &&
                    inv.status === 'pending'
                )

            if (existingInvitation) {
                return {
                    success: false,
                    error: 'A battle invitation is already pending for one of the users'
                }
            }

            // Create battle invitation
            const invitation: BattleInvitation = {
                id: crypto.randomUUID(),
                fromUserId,
                toUserId,
                fromCharacterId,
                toCharacterId,
                status: 'pending',
                expiresAt: new Date(Date.now() + 30000), // 30 seconds to respond
                createdAt: new Date()
            }

            this.activeInvitations.set(invitation.id, invitation)

            // Set auto-expiration
            setTimeout(() => {
                this.expireInvitation(invitation.id)
            }, 30000)

            return {
                success: true,
                invitation
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send battle invitation'
            }
        }
    }

    async respondToInvitation(invitationId: string, response: 'accepted' | 'declined'): Promise<MatchmakingResult> {
        try {
            const invitation = this.activeInvitations.get(invitationId)

            if (!invitation) {
                return {
                    success: false,
                    error: 'Invitation not found or expired'
                }
            }

            if (invitation.status !== 'pending') {
                return {
                    success: false,
                    error: 'Invitation is no longer pending'
                }
            }

            if (invitation.expiresAt < new Date()) {
                this.expireInvitation(invitationId)
                return {
                    success: false,
                    error: 'Invitation has expired'
                }
            }

            // Update invitation status
            invitation.status = response
            this.activeInvitations.set(invitationId, invitation)

            if (response === 'accepted') {
                // Create and start battle
                const battleResult = await this.battleService.createBattle(
                    invitation.fromUserId,
                    invitation.toUserId,
                    invitation.fromCharacterId,
                    invitation.toCharacterId
                )

                if (battleResult.success && battleResult.battle) {
                    // Start the battle immediately
                    const startResult = await this.battleService.startBattle(battleResult.battle.id)

                    // Remove invitation after battle is created
                    this.activeInvitations.delete(invitationId)

                    return {
                        success: true,
                        battle: startResult.battle,
                        invitation
                    }
                } else {
                    return {
                        success: false,
                        error: battleResult.error || 'Failed to create battle'
                    }
                }
            } else {
                // Remove declined invitation
                this.activeInvitations.delete(invitationId)

                return {
                    success: true,
                    invitation
                }
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to respond to invitation'
            }
        }
    }

    async getUserInvitations(userId: string): Promise<MatchmakingResult> {
        try {
            const userInvitations = Array.from(this.activeInvitations.values())
                .filter(inv =>
                    (inv.fromUserId === userId || inv.toUserId === userId) &&
                    inv.status === 'pending' &&
                    inv.expiresAt > new Date()
                )

            return {
                success: true,
                invitations: userInvitations
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get user invitations'
            }
        }
    }

    async cancelInvitation(invitationId: string, userId: string): Promise<MatchmakingResult> {
        try {
            const invitation = this.activeInvitations.get(invitationId)

            if (!invitation) {
                return {
                    success: false,
                    error: 'Invitation not found'
                }
            }

            // Only the sender can cancel the invitation
            if (invitation.fromUserId !== userId) {
                return {
                    success: false,
                    error: 'Only the sender can cancel the invitation'
                }
            }

            if (invitation.status !== 'pending') {
                return {
                    success: false,
                    error: 'Can only cancel pending invitations'
                }
            }

            // Remove invitation
            this.activeInvitations.delete(invitationId)

            return {
                success: true,
                invitation
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to cancel invitation'
            }
        }
    }

    private expireInvitation(invitationId: string): void {
        const invitation = this.activeInvitations.get(invitationId)
        if (invitation && invitation.status === 'pending') {
            invitation.status = 'expired'
            this.activeInvitations.delete(invitationId)
        }
    }

    // Auto-matchmaking: find and notify nearby users automatically
    async autoMatchmaking(userId: string, characterId: string): Promise<MatchmakingResult> {
        try {
            const nearbyResult = await this.findNearbyOpponents(userId, characterId)

            if (!nearbyResult.success || !nearbyResult.nearbyUsers || nearbyResult.nearbyUsers.length === 0) {
                return {
                    success: true,
                    nearbyUsers: []
                }
            }

            // For auto-matchmaking, we could automatically send invitations to the first nearby user
            // For now, we just return the nearby users for manual invitation
            return {
                success: true,
                nearbyUsers: nearbyResult.nearbyUsers
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Auto-matchmaking failed'
            }
        }
    }
}
