/**
 * WebSocket Service using Laravel Reverb (Pusher-compatible)
 * Manages real-time communication for multiplayer battles
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import Pusher from 'pusher-js'
import { API_CONFIG } from '../config/api'
import type { WebSocketMessage } from '../types/battle'
import { STORAGE_KEYS } from './api'

type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

type MessageHandler = (message: WebSocketMessage) => void

class WebSocketService {
    private pusher: Pusher | null = null
    private status: WebSocketStatus = 'disconnected'
    private messageHandlers: Set<MessageHandler> = new Set()
    private userId: string | null = null
    private channels: Map<string, Pusher.Channel> = new Map()

    /**
     * Get Reverb/Pusher configuration
     */
    private getReverbConfig(): { host: string; port: number; key: string; cluster?: string } {
        // Get from environment variables first
        const envKey =
            (Constants.expoConfig?.extra as any)?.reverbAppKey || process.env.EXPO_PUBLIC_REVERB_APP_KEY
        const envHost =
            (Constants.expoConfig?.extra as any)?.reverbHost || process.env.EXPO_PUBLIC_REVERB_HOST
        const envPort =
            (Constants.expoConfig?.extra as any)?.reverbPort || process.env.EXPO_PUBLIC_REVERB_PORT

        if (envKey && envHost && envPort) {
            return {
                host: envHost,
                port: parseInt(envPort, 10),
                key: envKey,
            }
        }

        // Fallback to API config-based detection
        // For local development
        if (__DEV__) {
            const baseUrl = API_CONFIG.BASE_URL

            // If running through Expo Go / Metro, try to use hostUri (device-friendly IP)
            const hostUri = Constants.expoConfig?.hostUri || (Constants as any)?.manifest?.debuggerHost
            if (hostUri) {
                const [host] = hostUri.replace('exp://', '').split(':')
                if (host) {
                    return {
                        host,
                        port: 8080,
                        key: envKey || 'caosfighters-key',
                    }
                }
            }

            if (baseUrl.includes('ngrok')) {
                // Extract ngrok URL
                const ngrokUrl = baseUrl.replace('/backend', '').replace('https://', '').replace('http://', '')
                return {
                    host: ngrokUrl.split(':')[0], // Remove port if present
                    port: 443,
                    key: 'caosfighters-key', // Should match REVERB_APP_KEY in .env
                }
            }
            // Local development
            return {
                host: 'localhost',
                port: 8080,
                key: 'caosfighters-key', // Should match REVERB_APP_KEY in .env
            }
        }

        // Production
        const baseUrl = API_CONFIG.BASE_URL.replace('https://', '').replace('http://', '').replace('/backend', '')
        return {
            host: baseUrl.split(':')[0],
            port: 443,
            key: process.env.EXPO_PUBLIC_REVERB_APP_KEY || 'caosfighters-key',
        }
    }

    /**
     * Connect to Reverb WebSocket server
     */
    async connect(userId: string): Promise<void> {
        if (this.status === 'connected' || this.status === 'connecting') {
            return
        }

        this.userId = userId
        this.status = 'connecting'

        try {
            const config = this.getReverbConfig()
            const wsHost = config.port === 443 ? `wss://${config.host}` : `ws://${config.host}:${config.port}`

            console.log('Connecting to Reverb WebSocket:', wsHost)

            // Get auth token for private channel authentication
            const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)

            // For Laravel Reverb, we use wsHost/wsPort
            // Pusher requires cluster to be set, but wsHost takes precedence
            this.pusher = new Pusher(config.key, {
                wsHost: config.host,
                wsPort: config.port,
                wssPort: 443,
                forceTLS: config.port === 443,
                enabledTransports: ['ws', 'wss'],
                disableStats: true,
                cluster: 'mt1', // Required by Pusher, but wsHost takes precedence for Reverb
                authEndpoint: `${API_CONFIG.BASE_URL}/broadcasting/auth`,
                auth: {
                    headers: {
                        ...(token && { Authorization: `Bearer ${token}` }),
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                },
            })

            this.pusher.connection.bind('connected', () => {
                console.log('Reverb WebSocket connected')
                this.status = 'connected'
            })

            this.pusher.connection.bind('disconnected', () => {
                console.log('Reverb WebSocket disconnected')
                this.status = 'disconnected'
            })

            this.pusher.connection.bind('error', (error: any) => {
                console.error('Reverb WebSocket error:', error)
                this.status = 'error'
            })

            // Subscribe to user channel for matchmaking
            if (userId) {
                const userChannel = this.pusher.subscribe(`private-user.${userId}`)
                this.channels.set(`private-user.${userId}`, userChannel)

                userChannel.bind('match.found', (data: any) => {
                    console.log('Match found event received:', data)
                    this.handleMessage({
                        type: 'match_found',
                        data: data.data,
                        battle_id: data.battle_id,
                    })
                })
            }
        } catch (error) {
            console.error('Failed to connect to Reverb:', error)
            this.status = 'error'
            throw error
        }
    }

    /**
     * Disconnect from Reverb WebSocket server
     */
    disconnect(): void {
        if (this.pusher) {
            this.channels.forEach((channel) => {
                this.pusher?.unsubscribe(channel.name)
            })
            this.channels.clear()
            this.pusher.disconnect()
            this.pusher = null
        }

        this.status = 'disconnected'
        this.userId = null
    }

    /**
     * Subscribe to battle channel
     */
    subscribeToBattle(battleId: string): void {
        if (!this.pusher || this.status !== 'connected') {
            console.warn('Pusher not connected, cannot subscribe to battle')
            return
        }

        const channelName = `private-battle.${battleId}`
        if (this.channels.has(channelName)) {
            return // Already subscribed
        }

        const battleChannel = this.pusher.subscribe(channelName)
        this.channels.set(channelName, battleChannel)

        battleChannel.bind('battle.attack', (data: any) => {
            console.log('Battle attack event received:', data)
            this.handleMessage({
                type: 'battle_attack',
                data: data.data,
                battle_id: data.battle_id,
            })
        })

        battleChannel.bind('battle.state_update', (data: any) => {
            console.log('Battle state update received:', data)
            this.handleMessage({
                type: 'battle_state_update',
                data: data.data,
                battle_id: data.battle_id,
            })
        })

        battleChannel.bind('battle.end', (data: any) => {
            console.log('Battle end event received:', data)
            this.handleMessage({
                type: 'battle_end',
                data: data.data,
                battle_id: data.battle_id,
            })
        })
    }

    /**
     * Unsubscribe from battle channel
     */
    unsubscribeFromBattle(battleId: string): void {
        const channelName = `private-battle.${battleId}`
        const channel = this.channels.get(channelName)
        if (channel && this.pusher) {
            this.pusher.unsubscribe(channelName)
            this.channels.delete(channelName)
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(message: WebSocketMessage): void {
        this.messageHandlers.forEach((handler) => {
            try {
                handler(message)
            } catch (error) {
                console.error('Error in message handler:', error)
            }
        })
    }

    /**
     * Register a message handler
     */
    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.add(handler)
        return () => {
            this.messageHandlers.delete(handler)
        }
    }

    /**
     * Join matchmaking queue (via HTTP API, not WebSocket)
     */
    joinMatchmaking(characterUserId: string): void {
        // Matchmaking is handled via HTTP API
        // Events will be received via WebSocket when match is found
        console.log('Matchmaking request sent via API')
    }

    /**
     * Leave matchmaking queue (via HTTP API)
     */
    leaveMatchmaking(): void {
        // Handled via HTTP API
        console.log('Leave matchmaking request sent via API')
    }

    /**
     * Send attack in battle (via HTTP API, broadcast via Reverb)
     */
    sendAttack(battleId: string, moveId: string): void {
        // Attack is sent via HTTP API
        // The backend will broadcast the result via Reverb
        console.log('Attack sent via API, will be broadcast via Reverb')
    }

    /**
     * Get current connection status
     */
    getStatus(): WebSocketStatus {
        return this.status
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.status === 'connected' && this.pusher?.connection.state === 'connected'
    }
}

// Export singleton instance
export const websocketService = new WebSocketService()
