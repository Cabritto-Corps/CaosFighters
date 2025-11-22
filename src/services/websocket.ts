/**
 * WebSocket Service - Supports both Laravel Reverb (Pusher) and custom WebSocket server
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
    private ws: WebSocket | null = null // Native WebSocket for custom server
    private useCustomWebSocket: boolean = false
    private status: WebSocketStatus = 'disconnected'
    private messageHandlers: Set<MessageHandler> = new Set()
    private userId: string | null = null
    private channels: Map<string, any> = new Map() // Pusher.Channel type
    private currentBattleId: string | null = null

    /**
     * Get WebSocket server URL (custom or Reverb)
     */
    private getWebSocketUrl(): string | null {
        // Check for custom WebSocket server URL in environment
        const customWsUrl =
            (Constants.expoConfig?.extra as any)?.websocketUrl ||
            process.env.EXPO_PUBLIC_WEBSOCKET_URL

        if (customWsUrl) {
            console.log('[WEBSOCKET] Using custom WebSocket URL from environment:', customWsUrl)
            this.useCustomWebSocket = true
            return customWsUrl.startsWith('ws://') || customWsUrl.startsWith('wss://')
                ? customWsUrl
                : `wss://${customWsUrl}`
        }

        // Check if we should use custom WebSocket based on API URL
        // Even in dev mode, if API is pointing to Railway, use custom WebSocket
        const baseUrl = API_CONFIG.BASE_URL
        console.log('[WEBSOCKET] Checking API URL for Railway:', baseUrl)

        if (baseUrl.includes('railway.app')) {
            // API is on Railway, use custom WebSocket server
            const wsHost = 'websocket-production-213e.up.railway.app'
            console.log('[WEBSOCKET] Detected Railway backend, using custom WebSocket server:', wsHost)
            this.useCustomWebSocket = true
            return `wss://${wsHost}`
        }

        console.log('[WEBSOCKET] No custom WebSocket URL detected, will use Reverb')
        return null
    }

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
     * Connect to WebSocket server (custom or Reverb)
     */
    async connect(userId: string): Promise<void> {
        if (this.status === 'connected' || this.status === 'connecting') {
            console.log('[WEBSOCKET] Already connected or connecting, skipping')
            return
        }

        this.userId = userId
        this.status = 'connecting'

        // Check if we should use custom WebSocket server
        const customWsUrl = this.getWebSocketUrl()
        console.log('[WEBSOCKET] WebSocket URL result:', customWsUrl, 'useCustom:', this.useCustomWebSocket)

        if (customWsUrl && this.useCustomWebSocket) {
            console.log('[WEBSOCKET] Connecting to custom WebSocket server')
            return this.connectCustomWebSocket(userId, customWsUrl)
        }

        // Otherwise use Reverb/Pusher
        console.log('[WEBSOCKET] Connecting to Reverb/Pusher')
        return this.connectReverb(userId)
    }

    /**
     * Connect to custom WebSocket server
     */
    private async connectCustomWebSocket(userId: string, wsUrl: string): Promise<void> {
        try {
            console.log('[WEBSOCKET] ========================================')
            console.log('[WEBSOCKET] Attempting to connect to custom WebSocket server')
            console.log('[WEBSOCKET] URL:', wsUrl)
            console.log('[WEBSOCKET] User ID:', userId)
            console.log('[WEBSOCKET] ========================================')

            this.ws = new WebSocket(wsUrl)

            this.ws.onopen = () => {
                console.log('[WEBSOCKET] Custom WebSocket connected')
                this.status = 'connected'

                // Authenticate with user ID
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(
                        JSON.stringify({
                            type: 'auth',
                            data: {
                                user_id: userId,
                            },
                        })
                    )
                }
            }

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data)

                    if (message.type === 'auth_success') {
                        return
                    }

                    // Handle matchmaking and battle messages
                    console.log(`[WEBSOCKET] Raw message received:`, message.type)

                    if (message.type === 'match_found') {
                        this.handleMessage({
                            type: 'match_found',
                            data: message.data,
                            battle_id: message.data?.battle_id,
                        })
                    } else if (message.type === 'battle_attack') {
                        this.handleMessage({
                            type: 'battle_attack',
                            data: message.data,
                            battle_id: message.battle_id,
                        })
                    } else if (message.type === 'battle_round_complete') {
                        console.log(`[WEBSOCKET] battle_round_complete message received, dispatching to handlers`)
                        this.handleMessage({
                            type: 'battle_round_complete',
                            data: message.data,
                            battle_id: message.battle_id,
                        })
                    } else if (message.type === 'battle_state_update') {
                        this.handleMessage({
                            type: 'battle_state_update',
                            data: message.data,
                            battle_id: message.battle_id,
                        })
                    } else if (message.type === 'battle_end') {
                        this.handleMessage({
                            type: 'battle_end',
                            data: message.data,
                            battle_id: message.battle_id,
                        })
                    } else if (message.type === 'error') {
                        // Propagate error to handlers so frontend can handle it
                        this.handleMessage({
                            type: 'error',
                            message: message.message,
                            battle_id: message.battle_id,
                        })
                    } else {
                        console.log(`[WEBSOCKET] Unknown message type:`, message.type)
                    }
                } catch (error) {
                    console.error('[WEBSOCKET] Error parsing message:', error)
                }
            }

            this.ws.onerror = (error) => {
                console.error('[WEBSOCKET] ========================================')
                console.error('[WEBSOCKET] Custom WebSocket connection error!')
                console.error('[WEBSOCKET] Error details:', error)
                console.error('[WEBSOCKET] URL attempted:', wsUrl)
                console.error('[WEBSOCKET] ========================================')
                this.status = 'error'
            }

            this.ws.onclose = (event) => {
                console.log('[WEBSOCKET] ========================================')
                console.log('[WEBSOCKET] Custom WebSocket disconnected')
                console.log('[WEBSOCKET] Close code:', event.code)
                console.log('[WEBSOCKET] Close reason:', event.reason || 'none')
                console.log('[WEBSOCKET] Was clean:', event.wasClean)
                console.log('[WEBSOCKET] ========================================')
                this.status = 'disconnected'
                this.ws = null
            }
        } catch (error) {
            console.error('[WEBSOCKET] Failed to connect to custom WebSocket:', error)
            this.status = 'error'
            throw error
        }
    }

    /**
     * Connect to Reverb WebSocket server
     */
    private async connectReverb(userId: string): Promise<void> {
        try {
            const config = this.getReverbConfig()
            const wsHost = config.port === 443 ? `wss://${config.host}` : `ws://${config.host}:${config.port}`

            console.log('[WEBSOCKET] Connecting to Reverb WebSocket:', wsHost)

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
                console.log('[WEBSOCKET] Reverb WebSocket connected')
                this.status = 'connected'
            })

            this.pusher.connection.bind('disconnected', () => {
                console.log('[WEBSOCKET] Reverb WebSocket disconnected')
                this.status = 'disconnected'
            })

            this.pusher.connection.bind('error', (error: any) => {
                console.error('[WEBSOCKET] Reverb WebSocket error:', error)
                this.status = 'error'
            })

            // Subscribe to user channel for matchmaking
            if (userId) {
                const userChannel = this.pusher.subscribe(`private-user.${userId}`)
                this.channels.set(`private-user.${userId}`, userChannel)

                userChannel.bind('match.found', (data: any) => {
                    console.log('[WEBSOCKET] Match found event received:', data)
                    this.handleMessage({
                        type: 'match_found',
                        data: data.data,
                        battle_id: data.battle_id,
                    })
                })
            }
        } catch (error) {
            console.error('[WEBSOCKET] Failed to connect to Reverb:', error)
            this.status = 'error'
            throw error
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        if (this.useCustomWebSocket && this.ws) {
            this.ws.close()
            this.ws = null
        } else if (this.pusher) {
            this.channels.forEach((channel) => {
                this.pusher?.unsubscribe(channel.name)
            })
            this.channels.clear()
            this.pusher.disconnect()
            this.pusher = null
        }

        this.status = 'disconnected'
        this.userId = null
        this.currentBattleId = null
    }

    /**
     * Subscribe to battle channel
     */
    subscribeToBattle(battleId: string): void {
        this.currentBattleId = battleId

        if (this.useCustomWebSocket) {
            // Custom WebSocket server handles battle messages automatically
            console.log('[WEBSOCKET] Battle subscription noted for custom WebSocket:', battleId)
            return
        }

        if (!this.pusher || this.status !== 'connected') {
            console.warn('[WEBSOCKET] Pusher not connected, cannot subscribe to battle')
            return
        }

        const channelName = `private-battle.${battleId}`
        if (this.channels.has(channelName)) {
            return // Already subscribed
        }

        const battleChannel = this.pusher.subscribe(channelName)
        this.channels.set(channelName, battleChannel)

        battleChannel.bind('battle.attack', (data: any) => {
            console.log('[WEBSOCKET] Battle attack event received:', data)
            this.handleMessage({
                type: 'battle_attack',
                data: data.data,
                battle_id: data.battle_id,
            })
        })

        battleChannel.bind('battle.state_update', (data: any) => {
            console.log('[WEBSOCKET] Battle state update received:', data)
            this.handleMessage({
                type: 'battle_state_update',
                data: data.data,
                battle_id: data.battle_id,
            })
        })

        battleChannel.bind('battle.end', (data: any) => {
            console.log('[WEBSOCKET] Battle end event received:', data)
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
    /**
     * Leave battle and notify server
     */
    leaveBattle(battleId: string): void {
        if (this.useCustomWebSocket && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(
                JSON.stringify({
                    type: 'leave_battle',
                    data: {
                        battle_id: battleId,
                    },
                })
            )
        }
        this.unsubscribeFromBattle(battleId)
    }

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
                console.error('[WEBSOCKET] Error in message handler:', error)
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
     * Join matchmaking queue
     */
    joinMatchmaking(characterUserId: string): void {
        if (this.useCustomWebSocket && this.ws && this.ws.readyState === WebSocket.OPEN && this.userId) {
            // Send join matchmaking message to custom WebSocket server
            console.log('[WEBSOCKET] Sending join_matchmaking to custom WebSocket server')
            this.ws.send(
                JSON.stringify({
                    type: 'join_matchmaking',
                    data: {
                        character_user_id: characterUserId,
                    },
                })
            )
        } else {
            // Matchmaking is handled via HTTP API for Reverb
            // Events will be received via WebSocket when match is found
            console.log('[WEBSOCKET] Matchmaking request sent via API')
        }
    }

    /**
     * Leave matchmaking queue
     */
    leaveMatchmaking(): void {
        if (this.useCustomWebSocket && this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Send leave matchmaking message to custom WebSocket server
            console.log('[WEBSOCKET] Sending leave_matchmaking to custom WebSocket server')
            this.ws.send(
                JSON.stringify({
                    type: 'leave_matchmaking',
                })
            )
        } else {
            // Handled via HTTP API for Reverb
            console.log('[WEBSOCKET] Leave matchmaking request sent via API')
        }
    }

    /**
     * Send attack in battle
     */
    sendAttack(battleId: string, moveId: string): void {
        if (this.useCustomWebSocket && this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Send attack message to custom WebSocket server
            console.log('[WEBSOCKET] Sending battle_attack to custom WebSocket server')
            this.ws.send(
                JSON.stringify({
                    type: 'battle_attack',
                    data: {
                        move_id: moveId,
                    },
                })
            )
        } else {
            // Attack is sent via HTTP API for Reverb
            // The backend will broadcast the result via Reverb
            console.log('[WEBSOCKET] Attack sent via API, will be broadcast via Reverb')
        }
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
        if (this.useCustomWebSocket) {
            return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN
        }
        return this.status === 'connected' && this.pusher?.connection.state === 'connected'
    }
}

// Export singleton instance
export const websocketService = new WebSocketService()
