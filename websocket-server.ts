import * as http from 'http'
import { WebSocket, WebSocketServer } from 'ws'

// ============================================================================
// Configuration
// ============================================================================

const BACKEND_URL = process.env.BACKEND_URL
    ? process.env.BACKEND_URL.startsWith('http')
        ? process.env.BACKEND_URL
        : `https://${process.env.BACKEND_URL}`
    : 'https://backend-production-a7bd.up.railway.app'

const PORT = parseInt(process.env.WS_PORT || '8080', 10)
const REQUEST_TIMEOUT = 60000 // 60 seconds
const POLLING_INTERVAL = 2000 // 2 seconds

// ============================================================================
// Types
// ============================================================================

interface Client {
    ws: WebSocket
    userId: string | null
    characterUserId: string | null
    battleId: string | null
    matchmakingInterval: NodeJS.Timeout | null
}

interface WebSocketMessage {
    type: 'auth' | 'join_matchmaking' | 'leave_matchmaking' | 'battle_attack'
    data?: {
        user_id?: string
        character_user_id?: string
        move_id?: string
    }
}

interface ApiResponse<T = unknown> {
    success: boolean
    message?: string
    error?: string
    data?: T
}

interface MatchmakingResponse {
    success: boolean
    message?: string
    queue_position?: number
}

interface MatchFoundData {
    match_found: boolean
    battle?: BattleData
}

interface BattleData {
    battle_id: string
    player1_id: string
    player2_id: string
    player1_character: CharacterData
    player2_character: CharacterData
}

interface CharacterData {
    character_user_id: string
    character: {
        id: string
        name: string
    }
    status: {
        current_hp: number
        max_hp: number
    }
    moves: {
        id: string
        name: string
    }[]
}

interface MatchFoundPayload {
    type: 'match_found'
    data: {
        battle_id: string
        opponent: {
            id: string
            name: string
            character: CharacterData['character']
            status: CharacterData['status']
            moves: CharacterData['moves']
        }
        player_character: {
            character_user_id: string
            character: CharacterData['character']
            status: CharacterData['status']
            moves: CharacterData['moves']
        }
        turn: 'player' | 'enemy'
    }
}

interface MatchmakingQueuedPayload {
    type: 'matchmaking_queued'
    message: string
    queue_position: number
}

interface ErrorPayload {
    type: 'error'
    message: string
}

type OutgoingMessage = MatchFoundPayload | MatchmakingQueuedPayload | ErrorPayload | { type: 'auth_success'; message: string } | { type: 'battle_attack'; battle_id: string; data: unknown }

// ============================================================================
// Client Management
// ============================================================================

const clients = new Map<WebSocket, Client>()

function createClient(ws: WebSocket): Client {
    return {
        ws,
        userId: null,
        characterUserId: null,
        battleId: null,
        matchmakingInterval: null,
    }
}

function cleanupClient(client: Client): void {
    if (client.matchmakingInterval) {
        clearInterval(client.matchmakingInterval)
        client.matchmakingInterval = null
    }
    clients.delete(client.ws)
}

// ============================================================================
// HTTP Request Helpers
// ============================================================================

async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        })
        clearTimeout(timeoutId)
        return response
    } catch (error) {
        clearTimeout(timeoutId)
        throw error
    }
}

async function callBackend<T = unknown>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: Record<string, unknown>
): Promise<ApiResponse<T>> {
    const url = `${BACKEND_URL}${endpoint}`
    console.log(`[WEBSOCKET] Calling backend: ${method} ${url}`)

    try {
        const response = await fetchWithTimeout(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[WEBSOCKET] HTTP error ${response.status}:`, errorText)
            return {
                success: false,
                message: `HTTP ${response.status}`,
                error: errorText,
            }
        }

        return await response.json()
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const isTimeout = error instanceof Error && error.name === 'AbortError'
        console.error(`[WEBSOCKET] Request failed:`, errorMessage)
        return {
            success: false,
            message: isTimeout ? 'Request timeout' : errorMessage,
            error: errorMessage,
        }
    }
}

// ============================================================================
// Message Sending
// ============================================================================

function send(ws: WebSocket, message: OutgoingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
    }
}

function sendError(ws: WebSocket, message: string): void {
    send(ws, { type: 'error', message })
}

// ============================================================================
// Matchmaking Logic
// ============================================================================

function isMatchFoundResponse(data: unknown): data is MatchFoundData {
    return (
        typeof data === 'object' &&
        data !== null &&
        'match_found' in data &&
        (data as MatchFoundData).match_found === true &&
        'battle' in data &&
        (data as MatchFoundData).battle !== undefined
    )
}

function getQueuePosition(data: unknown): number {
    if (typeof data === 'object' && data !== null) {
        const matchmakingData = data as MatchmakingResponse
        return matchmakingData.queue_position ?? 1
    }
    return 1
}

function processMatchFound(client: Client, battleData: BattleData): void {
    client.battleId = battleData.battle_id
    console.log(`[WEBSOCKET] Match found! Battle ID: ${battleData.battle_id}, Player1: ${battleData.player1_id}, Player2: ${battleData.player2_id}`)

    const isPlayer1 = battleData.player1_id === client.userId
    const playerCharacter = isPlayer1 ? battleData.player1_character : battleData.player2_character
    const opponentCharacter = isPlayer1 ? battleData.player2_character : battleData.player1_character
    const opponentId = isPlayer1 ? battleData.player2_id : battleData.player1_id

    const opponentClient = Array.from(clients.values()).find(
        (c) => c.userId === opponentId && c.battleId === null
    )

    if (opponentClient) {
        opponentClient.battleId = battleData.battle_id
        if (opponentClient.matchmakingInterval) {
            clearInterval(opponentClient.matchmakingInterval)
            opponentClient.matchmakingInterval = null
        }
        console.log(`[WEBSOCKET] Opponent ${opponentId} is connected, notifying both players`)

        notifyMatchFound(client, battleData.battle_id, opponentId, playerCharacter, opponentCharacter, isPlayer1 ? 'player' : 'enemy')
        notifyMatchFound(opponentClient, battleData.battle_id, client.userId!, opponentCharacter, playerCharacter, isPlayer1 ? 'enemy' : 'player')
    } else {
        console.log(`[WEBSOCKET] Opponent ${opponentId} is NOT connected, only notifying current player`)
        notifyMatchFound(client, battleData.battle_id, opponentId, playerCharacter, opponentCharacter, isPlayer1 ? 'player' : 'enemy')
    }
}

function notifyMatchFound(
    client: Client,
    battleId: string,
    opponentId: string,
    playerCharacter: CharacterData,
    opponentCharacter: CharacterData,
    turn: 'player' | 'enemy'
): void {
    send(client.ws, {
        type: 'match_found',
        data: {
            battle_id: battleId,
            opponent: {
                id: opponentId,
                name: opponentCharacter.character.name,
                character: opponentCharacter.character,
                status: opponentCharacter.status,
                moves: opponentCharacter.moves,
            },
            player_character: {
                character_user_id: playerCharacter.character_user_id,
                character: playerCharacter.character,
                status: playerCharacter.status,
                moves: playerCharacter.moves,
            },
            turn,
        },
    })
}

async function handleJoinMatchmaking(client: Client, characterUserId: string): Promise<void> {
    if (!client.userId) {
        sendError(client.ws, 'User not authenticated')
        return
    }

    client.characterUserId = characterUserId
    console.log(`[WEBSOCKET] User ${client.userId} joining matchmaking with character ${characterUserId}`)

    const result = await callBackend<MatchFoundData | MatchmakingResponse>(
        '/backend/battles/matchmaking/join',
        'POST',
        {
            user_id: client.userId,
            character_user_id: characterUserId,
        }
    )

    console.log(`[WEBSOCKET] ========================================`)
    console.log(`[WEBSOCKET] Full matchmaking response for user ${client.userId}:`)
    console.log(`[WEBSOCKET]`, JSON.stringify(result, null, 2))
    console.log(`[WEBSOCKET] ========================================`)

    // Check if result.data exists and has match_found
    const hasMatchInData = result.data && typeof result.data === 'object' && 'match_found' in result.data && (result.data as any).match_found === true
    const hasBattleInData = result.data && typeof result.data === 'object' && 'battle' in result.data && (result.data as any).battle !== undefined

    console.log(`[WEBSOCKET] Matchmaking response analysis:`, {
        success: result.success,
        hasData: !!result.data,
        dataType: typeof result.data,
        hasMatchInData,
        hasBattleInData,
        isMatchFoundResponse: result.data ? isMatchFoundResponse(result.data) : false,
        battleId: hasBattleInData ? (result.data as any).battle?.battle_id : undefined,
    })

    if (result.data && isMatchFoundResponse(result.data) && result.data.battle) {
        console.log(`[WEBSOCKET] Match found in initial join! Processing match...`)
        processMatchFound(client, result.data.battle)
        return
    }

    // No match found, queue the user
    const queuePosition = result.data ? getQueuePosition(result.data) : 1
    console.log(`[WEBSOCKET] User ${client.userId} queued for matchmaking, position: ${queuePosition}`)

    send(client.ws, {
        type: 'matchmaking_queued',
        message: 'Waiting for opponent...',
        queue_position: queuePosition,
    })

    // Start polling
    startMatchmakingPolling(client)
}

function startMatchmakingPolling(client: Client): void {
    if (client.matchmakingInterval) {
        clearInterval(client.matchmakingInterval)
    }

    console.log(`[WEBSOCKET] Starting polling interval for user ${client.userId}`)

    client.matchmakingInterval = setInterval(async () => {
        if (client.battleId || !client.userId || !client.characterUserId) {
            if (client.matchmakingInterval) {
                clearInterval(client.matchmakingInterval)
                client.matchmakingInterval = null
            }
            return
        }

        try {
            // Use status endpoint for polling instead of join to avoid re-joining queue
            const result = await callBackend<MatchFoundData | MatchmakingResponse>(
                `/backend/battles/matchmaking/status?user_id=${client.userId}`,
                'GET'
            )

            console.log(`[WEBSOCKET] Polling result for user ${client.userId}:`, {
                success: result.success,
                hasData: !!result.data,
                dataType: typeof result.data,
                matchFound: result.data && typeof result.data === 'object' && 'match_found' in result.data ? (result.data as any).match_found : undefined,
                hasBattle: result.data && typeof result.data === 'object' && 'battle' in result.data,
                isMatchFoundResponse: result.data ? isMatchFoundResponse(result.data) : false,
                battleId: result.data && typeof result.data === 'object' && 'battle' in result.data ? (result.data as any).battle?.battle_id : undefined,
            })

            // Check if match found
            if (result.data && isMatchFoundResponse(result.data) && result.data.battle) {
                console.log(`[WEBSOCKET] Match found via polling! Battle ID: ${result.data.battle.battle_id}`)
                processMatchFound(client, result.data.battle)

                if (client.matchmakingInterval) {
                    clearInterval(client.matchmakingInterval)
                    client.matchmakingInterval = null
                }
                return
            }

            // Also check if result.data has match_found directly (alternative structure)
            if (result.data && typeof result.data === 'object' && 'match_found' in result.data && (result.data as any).match_found === true && 'battle' in result.data) {
                const battleData = (result.data as any).battle
                if (battleData && battleData.battle_id) {
                    console.log(`[WEBSOCKET] Match found via polling (alternative structure)! Battle ID: ${battleData.battle_id}`)
                    processMatchFound(client, battleData)

                    if (client.matchmakingInterval) {
                        clearInterval(client.matchmakingInterval)
                        client.matchmakingInterval = null
                    }
                    return
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`[WEBSOCKET] Polling error for user ${client.userId}:`, errorMessage)
        }
    }, POLLING_INTERVAL)
}

async function handleLeaveMatchmaking(client: Client): Promise<void> {
    if (client.matchmakingInterval) {
        clearInterval(client.matchmakingInterval)
        client.matchmakingInterval = null
    }

    if (client.userId) {
        try {
            await callBackend('/backend/battles/matchmaking/leave', 'POST', {
                user_id: client.userId,
            })
        } catch (error) {
            console.error(`[WEBSOCKET] Error leaving matchmaking:`, error)
        }
    }
}

// ============================================================================
// Battle Logic
// ============================================================================

interface AttackResponse {
    success: boolean
    message?: string
    data?: {
        move_name: string
        damage: number
        enemy_current_hp: number
        turn: string
        is_finished: boolean
        winner_id: string | null
    }
}

async function handleBattleAttack(client: Client, moveId: string): Promise<void> {
    if (!client.battleId || !client.userId) {
        sendError(client.ws, 'Not in a battle')
        return
    }

    try {
        const result = await callBackend<AttackResponse['data']>(
            `/backend/battles/${client.battleId}/attack`,
            'POST',
            {
                user_id: client.userId,
                move_id: moveId,
            }
        )

        if (!result.success || !result.data) {
            sendError(client.ws, result.message || 'Attack failed')
            return
        }

        const attackData = result.data

        // Find opponent and notify them
        const opponentClient = Array.from(clients.values()).find(
            (c) => c.battleId === client.battleId && c.userId !== client.userId && c.userId !== null
        )

        if (opponentClient) {
            send(opponentClient.ws, {
                type: 'battle_attack',
                battle_id: client.battleId,
                data: {
                    battle_id: client.battleId,
                    attacker_id: client.userId,
                    move_id: moveId,
                    move_name: attackData.move_name,
                    damage: attackData.damage,
                    target_hp: attackData.enemy_current_hp,
                    turn: 'enemy',
                    battle_ended: attackData.is_finished,
                    winner_id: attackData.winner_id,
                },
            })
        }

        // Confirm to attacker
        send(client.ws, {
            type: 'battle_attack',
            battle_id: client.battleId,
            data: {
                battle_id: client.battleId,
                attacker_id: client.userId,
                move_id: moveId,
                move_name: attackData.move_name,
                damage: attackData.damage,
                target_hp: attackData.enemy_current_hp,
                turn: 'player',
                battle_ended: attackData.is_finished,
                winner_id: attackData.winner_id,
            },
        })
    } catch (error) {
        console.error(`[WEBSOCKET] Error executing attack:`, error)
        sendError(client.ws, 'Failed to execute attack')
    }
}

// ============================================================================
// Message Handler
// ============================================================================

async function handleMessage(client: Client, message: WebSocketMessage): Promise<void> {
    console.log(`[WEBSOCKET] Handling message type: ${message.type}`)

    switch (message.type) {
        case 'auth':
            if (!message.data?.user_id) {
                sendError(client.ws, 'User ID required for authentication')
                return
            }
            client.userId = message.data.user_id
            console.log(`[WEBSOCKET] User authenticated: ${client.userId}`)
            send(client.ws, { type: 'auth_success', message: 'Authenticated' })
            break

        case 'join_matchmaking':
            if (!client.userId) {
                sendError(client.ws, 'User must be authenticated first')
                return
            }
            if (!message.data?.character_user_id) {
                sendError(client.ws, 'Character user ID required')
                return
            }
            await handleJoinMatchmaking(client, message.data.character_user_id)
            break

        case 'leave_matchmaking':
            await handleLeaveMatchmaking(client)
            break

        case 'battle_attack':
            if (!message.data?.move_id) {
                sendError(client.ws, 'Move ID required')
                return
            }
            await handleBattleAttack(client, message.data.move_id)
            break

        default:
            sendError(client.ws, `Unknown message type: ${(message as WebSocketMessage).type}`)
    }
}

// ============================================================================
// WebSocket Server Setup
// ============================================================================

const server = http.createServer()

server.on('request', (req, res) => {
    console.log(`[WEBSOCKET] HTTP request received: ${req.method} ${req.url}`)
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('This is a WebSocket server')
})

const wss = new WebSocketServer({
    server,
    perMessageDeflate: false,
})

wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress
    const userAgent = req.headers['user-agent'] || 'unknown'

    console.log(`[WEBSOCKET] ========================================`)
    console.log(`[WEBSOCKET] NEW CONNECTION RECEIVED!`)
    console.log(`[WEBSOCKET] Client IP: ${clientIp}`)
    console.log(`[WEBSOCKET] User-Agent: ${userAgent}`)
    console.log(`[WEBSOCKET] Total clients connected: ${clients.size + 1}`)
    console.log(`[WEBSOCKET] ========================================`)

    const client = createClient(ws)
    clients.set(ws, client)

    ws.on('message', async (message: Buffer) => {
        try {
            const data = JSON.parse(message.toString()) as WebSocketMessage
            console.log(`[WEBSOCKET] Received message type: ${data.type} from user: ${client.userId || 'unauthenticated'}`)
            await handleMessage(client, data)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Invalid message format'
            console.error(`[WEBSOCKET] Error handling message:`, errorMessage)
            sendError(ws, 'Invalid message format')
        }
    })

    ws.on('close', () => {
        console.log(`[WEBSOCKET] Connection closed for user: ${client.userId || 'unauthenticated'}`)
        console.log(`[WEBSOCKET] Total clients remaining: ${clients.size - 1}`)
        cleanupClient(client)
    })

    ws.on('error', (error) => {
        console.error(`[WEBSOCKET] WebSocket error:`, error)
        cleanupClient(client)
    })
})

// ============================================================================
// Server Startup
// ============================================================================

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[WEBSOCKET] ========================================`)
    console.log(`[WEBSOCKET] WebSocket server started successfully`)
    console.log(`[WEBSOCKET] Listening on port ${PORT}`)
    console.log(`[WEBSOCKET] Backend URL: ${BACKEND_URL}`)
    console.log(`[WEBSOCKET] ========================================`)
    console.log(`[WEBSOCKET] Waiting for client connections...`)
})
