import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../infra/supabase/client'
import { BattleState } from '../entities/Battle'
import { BattleInvitation } from './MatchmakingService'

export interface RealtimeEvent {
    type: 'battle_invitation' | 'battle_update' | 'battle_ended' | 'user_nearby' | 'location_update'
    data: any
    userId?: string
    battleId?: string
    timestamp: Date
}

export interface RealtimeResult {
    success: boolean
    channel?: RealtimeChannel
    error?: string
}

export class RealtimeService {
    private channels: Map<string, RealtimeChannel> = new Map()

    // Subscribe to battle invitations for a specific user
    async subscribeToBattleInvitations(userId: string, callback: (invitation: BattleInvitation) => void): Promise<RealtimeResult> {
        try {
            const channelName = `battle_invitations:${userId}`

            // Remove existing channel if it exists
            if (this.channels.has(channelName)) {
                await this.unsubscribe(channelName)
            }

            const channel = supabase
                .channel(channelName)
                .on('broadcast', { event: 'battle_invitation' }, (payload: any) => {
                    if (payload.payload?.toUserId === userId) {
                        callback(payload.payload?.invitation)
                    }
                })
                .subscribe()

            this.channels.set(channelName, channel)

            return {
                success: true,
                channel
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to subscribe to battle invitations'
            }
        }
    }

    // Subscribe to battle updates for a specific battle
    async subscribeToBattle(battleId: string, callback: (battle: BattleState) => void): Promise<RealtimeResult> {
        try {
            const channelName = `battle:${battleId}`

            // Remove existing channel if it exists
            if (this.channels.has(channelName)) {
                await this.unsubscribe(channelName)
            }

            const channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'battles',
                        filter: `id=eq.${battleId}`
                    },
                    (payload) => {
                        // Transform database payload to domain entity
                        if (payload.new) {
                            // You would use BattleMapper here in a real implementation
                            callback(payload.new as any)
                        }
                    }
                )
                .subscribe()

            this.channels.set(channelName, channel)

            return {
                success: true,
                channel
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to subscribe to battle updates'
            }
        }
    }

    // Subscribe to nearby users updates
    async subscribeToNearbyUsers(userId: string, callback: (users: string[]) => void): Promise<RealtimeResult> {
        try {
            const channelName = `nearby_users:${userId}`

            // Remove existing channel if it exists
            if (this.channels.has(channelName)) {
                await this.unsubscribe(channelName)
            }

            const channel = supabase
                .channel(channelName)
                .on('broadcast', { event: 'nearby_users_update' }, (payload: any) => {
                    if (payload.payload?.userId === userId) {
                        callback(payload.payload?.nearbyUserIds)
                    }
                })
                .subscribe()

            this.channels.set(channelName, channel)

            return {
                success: true,
                channel
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to subscribe to nearby users'
            }
        }
    }

    // Broadcast battle invitation to target user
    async broadcastBattleInvitation(invitation: BattleInvitation): Promise<RealtimeResult> {
        try {
            const channelName = `battle_invitations:${invitation.toUserId}`

            await supabase
                .channel(channelName)
                .send({
                    type: 'broadcast',
                    event: 'battle_invitation',
                    payload: {
                        toUserId: invitation.toUserId,
                        invitation
                    }
                })

            return {
                success: true
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to broadcast battle invitation'
            }
        }
    }

    // Broadcast battle state updates to both participants
    async broadcastBattleUpdate(battle: BattleState): Promise<RealtimeResult> {
        try {
            // Broadcast to both players
            const player1Channel = `battle_updates:${battle.player1.userId}`
            const player2Channel = `battle_updates:${battle.player2.userId}`

            const broadcastData = {
                type: 'broadcast' as const,
                event: 'battle_update',
                payload: { battle }
            }

            // Send to both players
            await Promise.all([
                supabase.channel(player1Channel).send(broadcastData),
                supabase.channel(player2Channel).send(broadcastData)
            ])

            return {
                success: true
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to broadcast battle update'
            }
        }
    }

    // Broadcast nearby users update
    async broadcastNearbyUsers(userId: string, nearbyUserIds: string[]): Promise<RealtimeResult> {
        try {
            const channelName = `nearby_users:${userId}`

            await supabase
                .channel(channelName)
                .send({
                    type: 'broadcast',
                    event: 'nearby_users_update',
                    payload: {
                        userId,
                        nearbyUserIds
                    }
                })

            return {
                success: true
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to broadcast nearby users'
            }
        }
    }

    // Unsubscribe from a specific channel
    async unsubscribe(channelName: string): Promise<RealtimeResult> {
        try {
            const channel = this.channels.get(channelName)

            if (channel) {
                await supabase.removeChannel(channel)
                this.channels.delete(channelName)
            }

            return {
                success: true
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to unsubscribe'
            }
        }
    }

    // Unsubscribe from all channels for a user
    async unsubscribeUser(userId: string): Promise<RealtimeResult> {
        try {
            const userChannels = Array.from(this.channels.keys())
                .filter(channelName => channelName.includes(userId))

            for (const channelName of userChannels) {
                await this.unsubscribe(channelName)
            }

            return {
                success: true
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to unsubscribe user'
            }
        }
    }

    // Get all active channels
    getActiveChannels(): string[] {
        return Array.from(this.channels.keys())
    }

    // Check if user has active subscriptions
    hasActiveSubscriptions(userId: string): boolean {
        return Array.from(this.channels.keys())
            .some(channelName => channelName.includes(userId))
    }
}
