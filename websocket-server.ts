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
    type: 'auth' | 'join_matchmaking' | 'leave_matchmaking' | 'battle_attack' | 'leave_battle'
    data?: {
        user_id?: string
        character_user_id?: string
        move_id?: string
        battle_id?: string
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
    data: BattleData & {
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

type OutgoingMessage =
    | { type: 'battle_round_complete'; battle_id: string; data: { battle_id: string; round_results: unknown; battle_ended: boolean; winner_id: string | null } }
    | MatchFoundPayload
    | MatchmakingQueuedPayload
    | ErrorPayload
    | { type: 'auth_success'; message: string }
    | { type: 'battle_attack'; battle_id: string; data: unknown }
    | { type: 'battle_end'; battle_id: string; data: { message: string; winner_id: string | null } }

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
            const contentType = response.headers.get('content-type')
            let errorData: any = {}

            // Try to parse JSON error response if available
            if (contentType && contentType.includes('application/json')) {
                try {
                    errorData = await response.json()
                } catch {
                    // If JSON parse fails, use text
                    const errorText = await response.text()
                    errorData = { error: errorText }
                }
            } else {
                const errorText = await response.text()
                errorData = { error: errorText }
            }

            console.error(`[WEBSOCKET] HTTP error ${response.status}:`, errorData)
            return {
                success: false,
                message: errorData.message || `HTTP ${response.status}`,
                error: errorData.error || errorData.message || `HTTP ${response.status}`,
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

        notifyMatchFound(client, battleData, isPlayer1 ? 'player' : 'enemy')
        notifyMatchFound(opponentClient, battleData, isPlayer1 ? 'enemy' : 'player')
    } else {
        console.log(`[WEBSOCKET] Opponent ${opponentId} is NOT connected, only notifying current player`)
        notifyMatchFound(client, battleData, isPlayer1 ? 'player' : 'enemy')
    }
}

function notifyMatchFound(
    client: Client,
    battleData: BattleData,
    turn: 'player' | 'enemy'
): void {
    send(client.ws, {
        type: 'match_found',
        data: {
            ...battleData,
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
    // If a battle is already assigned, ignore leave request to prevent disrupting match start
    if (client.battleId) {
        console.log(`[WEBSOCKET] Ignoring leave_matchmaking request - client ${client.userId} already has battle ${client.battleId}`)
        return
    }

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

async function handleLeaveBattle(client: Client, data: unknown): Promise<void> {
    const dataObj = data as { battle_id?: string } | undefined
    const battleId = dataObj?.battle_id || client.battleId

    if (!battleId) {
        return
    }

    // Find opponent and notify them
    const opponent = Array.from(clients.values()).find(
        (c: Client) => c.userId && c.battleId === battleId && c.userId !== client.userId
    )

    if (opponent) {
        send(opponent.ws, {
            type: 'battle_end',
            battle_id: battleId,
            data: {
                message: 'Oponente saiu da batalha',
                winner_id: opponent.userId || null,
            },
        })
    }

    // Clear battle reference
    client.battleId = null
}

// ============================================================================
// Battle Logic
// ============================================================================

interface AttackResponse {
    success: boolean
    message?: string
    waiting_for_opponent?: boolean
    round_complete?: boolean
    round_results?: {
        player1_attack?: {
            attacker_id: string
            defender_id: string
            move_id: string
            move_name: string
            damage: number
            hit: boolean
            defender_current_hp: number
            battle_ended: boolean
            winner_id: string | null
        }
        player2_attack?: {
            attacker_id: string
            defender_id: string
            move_id: string
            move_name: string
            damage: number
            hit: boolean
            defender_current_hp: number
            battle_ended: boolean
            winner_id: string | null
        }
    }
    battle_ended?: boolean
    winner_id?: string | null
    data?: {
        move_name: string
        damage: number
        enemy_current_hp: number
        turn: string
        is_finished: boolean
        winner_id: string | null
        waiting_for_opponent?: boolean
        round_complete?: boolean
        player1_attack?: unknown
        player2_attack?: unknown
    }
}

async function handleBattleAttack(client: Client, moveId: string): Promise<void> {
    console.log(`[WEBSOCKET] =======================================`)
    console.log(`[WEBSOCKET] BATTLE ATTACK REQUEST RECEIVED`)
    console.log(`[WEBSOCKET] User ID: ${client.userId}`)
    console.log(`[WEBSOCKET] Battle ID: ${client.battleId}`)
    console.log(`[WEBSOCKET] Move ID: ${moveId}`)
    console.log(`[WEBSOCKET] =======================================`)

    if (!client.battleId || !client.userId) {
        console.error(`[WEBSOCKET] Invalid battle attack request - missing battleId or userId`)
        sendError(client.ws, 'Not in a battle')
        return
    }

    try {
        console.log(`[WEBSOCKET] Calling backend attack endpoint for battle ${client.battleId}`)
        const result = await callBackend<AttackResponse>(
            `/backend/battles/${client.battleId}/attack`,
            'POST',
            {
                user_id: client.userId,
                move_id: moveId,
            }
        )

        const responseData = result.data as any
        console.log(`[WEBSOCKET] Full backend response:`, JSON.stringify(result, null, 2))
        console.log(`[WEBSOCKET] Response data structure:`, {
            success: result.success,
            hasData: !!result.data,
            message: result.message,
            error: result.error,
            dataKeys: result.data ? Object.keys(result.data) : [],
            waitingForOpponent: responseData?.waiting_for_opponent,
            roundComplete: responseData?.round_complete,
            hasRoundResults: !!responseData?.round_results,
            roundResultsKeys: responseData?.round_results ? Object.keys(responseData.round_results) : [],
            battleEnded: responseData?.battle_ended,
            winnerId: responseData?.winner_id,
        })

        if (!result.success) {
            const errorMessage = result.message || result.error || 'Attack failed - invalid turn or battle state'
            console.error(`[WEBSOCKET] Attack failed:`, errorMessage)
            console.error(`[WEBSOCKET] Full error response:`, JSON.stringify(result, null, 2))
            sendError(client.ws, errorMessage)
            return
        }

        // Find opponent
        const opponentClient = Array.from(clients.values()).find(
            (c) => c.battleId === client.battleId && c.userId !== client.userId && c.userId !== null
        )

        // Handle round complete (both attacks processed)
        // Check both direct access and nested in data
        const roundComplete = responseData?.round_complete || responseData?.data?.round_complete
        const roundResults = responseData?.round_results || responseData?.data?.round_results

        // Check if round_complete is true (boolean or string "true")
        const isRoundComplete = roundComplete === true || roundComplete === 'true' || roundComplete === 1

        console.log(`[WEBSOCKET] Checking round_complete:`, {
            hasResponseData: !!responseData,
            roundComplete: roundComplete,
            roundCompleteType: typeof roundComplete,
            isRoundComplete: isRoundComplete,
            hasRoundResults: !!roundResults,
            responseDataType: typeof responseData,
            responseDataKeys: responseData ? Object.keys(responseData) : [],
            responseDataString: JSON.stringify(responseData).substring(0, 500),
        })

        if (isRoundComplete && roundResults) {
            const battleEnded = responseData?.battle_ended || responseData?.data?.battle_ended || false
            const winnerId = responseData?.winner_id || responseData?.data?.winner_id || null

            // Send round complete to both players
            const roundCompleteMessage = {
                type: 'battle_round_complete' as const,
                battle_id: client.battleId,
                data: {
                    battle_id: client.battleId,
                    round_results: roundResults,
                    battle_ended: battleEnded,
                    winner_id: winnerId,
                },
            }

            console.log(`[WEBSOCKET] Round complete message:`, JSON.stringify(roundCompleteMessage, null, 2))

            console.log(`[WEBSOCKET] Sending round_complete to attacker ${client.userId}`)
            send(client.ws, roundCompleteMessage)

            if (opponentClient) {
                console.log(`[WEBSOCKET] Sending round_complete to opponent ${opponentClient.userId}`)
                send(opponentClient.ws, roundCompleteMessage)
            } else {
                console.warn(`[WEBSOCKET] No opponent found to send round_complete`)
            }

            console.log(`[WEBSOCKET] Round complete broadcasted to both players`)
            console.log(`[WEBSOCKET] ========================================`)
            return
        }

        // Handle pending attack (waiting for opponent)
        if (responseData?.waiting_for_opponent) {
            // Confirm to attacker that attack is queued
            send(client.ws, {
                type: 'battle_attack',
                battle_id: client.battleId,
                data: {
                    battle_id: client.battleId,
                    attacker_id: client.userId,
                    move_id: moveId,
                    move_name: responseData?.move_name || 'Unknown',
                    damage: responseData?.damage || 0,
                    waiting_for_opponent: true,
                },
            })

            console.log(`[WEBSOCKET] Attack queued, waiting for opponent`)
            console.log(`[WEBSOCKET] ========================================`)
            return
        }

        // Handle single attack (bot battle or legacy)
        if (!responseData) {
            console.error(`[WEBSOCKET] Attack succeeded but no data returned`)
            sendError(client.ws, 'Attack succeeded but no data returned')
            return
        }

        const attackData = responseData

        console.log(`[WEBSOCKET] Opponent lookup:`, {
            found: !!opponentClient,
            opponentUserId: opponentClient?.userId || 'not found',
            totalClients: clients.size,
        })

        if (opponentClient) {
            console.log(`[WEBSOCKET] Sending attack notification to opponent ${opponentClient.userId}`)
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
            console.log(`[WEBSOCKET] Attack notification sent to opponent`)
        } else {
            console.warn(`[WEBSOCKET] Opponent not found for battle ${client.battleId} - cannot notify opponent`)
        }

        // Confirm to attacker
        console.log(`[WEBSOCKET] Sending attack confirmation to attacker ${client.userId}`)
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
        console.log(`[WEBSOCKET] Attack confirmation sent to attacker`)
        console.log(`[WEBSOCKET] ========================================`)
    } catch (error) {
        console.error(`[WEBSOCKET] ========================================`)
        console.error(`[WEBSOCKET] ERROR executing attack:`, error)
        console.error(`[WEBSOCKET] User ID: ${client.userId}`)
        console.error(`[WEBSOCKET] Battle ID: ${client.battleId}`)
        console.error(`[WEBSOCKET] Move ID: ${moveId}`)
        console.error(`[WEBSOCKET] ========================================`)
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

        case 'leave_battle':
            await handleLeaveBattle(client, message.data)
            break

        case 'battle_attack':
            console.log(`[WEBSOCKET] Received battle_attack message from user ${client.userId}`)
            console.log(`[WEBSOCKET] Message data:`, JSON.stringify(message.data, null, 2))
            if (!message.data?.move_id) {
                console.error(`[WEBSOCKET] Battle attack message missing move_id`)
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
