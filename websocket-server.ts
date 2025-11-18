import * as http from 'http'
import { WebSocket, WebSocketServer } from 'ws'

// Get backend URL from environment or use default
let BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

// Ensure BACKEND_URL has protocol
if (!BACKEND_URL.startsWith('http://') && !BACKEND_URL.startsWith('https://')) {
    // If it's a Railway URL, use https
    if (BACKEND_URL.includes('railway.app')) {
        BACKEND_URL = `https://${BACKEND_URL}`
    } else {
        BACKEND_URL = `http://${BACKEND_URL}`
    }
}

const PORT = parseInt(process.env.WS_PORT || '8080', 10)

interface Client {
    ws: WebSocket
    userId: string | null
    characterUserId: string | null
    battleId: string | null
    matchmakingInterval: NodeJS.Timeout | null
}

const clients = new Map<WebSocket, Client>()

const server = http.createServer()

// Add request logging for debugging
server.on('request', (req, res) => {
    console.log(`[WEBSOCKET] HTTP request received: ${req.method} ${req.url}`)
    console.log(`[WEBSOCKET] This is a WebSocket server, HTTP requests will be rejected`)
})

const wss = new WebSocketServer({
    server,
    perMessageDeflate: false, // Disable compression for better compatibility
})

wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress
    const userAgent = req.headers['user-agent'] || 'unknown'
    console.log(`[WEBSOCKET] ========================================`)
    console.log(`[WEBSOCKET] NEW CONNECTION RECEIVED!`)
    console.log(`[WEBSOCKET] Client IP: ${clientIp}`)
    console.log(`[WEBSOCKET] User-Agent: ${userAgent}`)
    console.log(`[WEBSOCKET] Headers:`, JSON.stringify(req.headers, null, 2))
    console.log(`[WEBSOCKET] Total clients connected: ${clients.size + 1}`)
    console.log(`[WEBSOCKET] ========================================`)

    const client: Client = {
        ws,
        userId: null,
        characterUserId: null,
        battleId: null,
        matchmakingInterval: null,
    }

    clients.set(ws, client)

    ws.on('message', async (message: string) => {
        try {
            const data = JSON.parse(message.toString())
            console.log(`[WEBSOCKET] Received message type: ${data.type} from user: ${client.userId || 'unauthenticated'}`)
            await handleMessage(client, data)
        } catch (error) {
            console.error('[WEBSOCKET] Error handling message:', error)
            sendError(ws, 'Invalid message format')
        }
    })

    ws.on('close', () => {
        console.log(`[WEBSOCKET] Connection closed for user: ${client.userId || 'unauthenticated'}`)
        console.log(`[WEBSOCKET] Total clients remaining: ${clients.size - 1}`)
        // Clear matchmaking interval if exists
        if (client.matchmakingInterval) {
            clearInterval(client.matchmakingInterval)
        }
        clients.delete(ws)
    })

    ws.on('error', (error) => {
        console.error('[WEBSOCKET] WebSocket error:', error)
        clients.delete(ws)
    })
})

async function handleMessage(client: Client, data: any) {
    console.log(`[WEBSOCKET] Handling message type: ${data.type}`)
    switch (data.type) {
        case 'auth':
            client.userId = data.data?.user_id || null
            console.log(`[WEBSOCKET] User authenticated: ${client.userId}`)
            send(client.ws, { type: 'auth_success', message: 'Authenticated' })
            break

        case 'join_matchmaking':
            if (!client.userId || !data.data?.character_user_id) {
                console.log(`[WEBSOCKET] Join matchmaking failed: missing user_id or character_user_id`)
                sendError(client.ws, 'User ID and character ID required')
                return
            }

            client.characterUserId = data.data.character_user_id
            console.log(`[WEBSOCKET] User ${client.userId} joining matchmaking with character ${client.characterUserId}`)

            // Call Laravel API to join matchmaking
            try {
                console.log(`[WEBSOCKET] Calling backend: ${BACKEND_URL}/backend/battles/matchmaking/join`)
                const response = await fetch(`${BACKEND_URL}/backend/battles/matchmaking/join`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: client.userId,
                        character_user_id: client.characterUserId,
                    }),
                })

                // Check HTTP status first
                if (!response.ok) {
                    console.error(`[WEBSOCKET] HTTP error! Status: ${response.status}`)
                    const errorText = await response.text()
                    console.error(`[WEBSOCKET] Error response:`, errorText)
                    sendError(client.ws, `HTTP ${response.status}: Failed to join matchmaking`)
                    return
                }

                const result = await response.json()
                console.log(`[WEBSOCKET] ========================================`)
                console.log(`[WEBSOCKET] Full matchmaking response for user ${client.userId}:`)
                console.log(`[WEBSOCKET]`, JSON.stringify(result, null, 2))
                console.log(`[WEBSOCKET] ========================================`)

                // Check if match was found - the response structure differs:
                // - Match found: { success: true, data: { match_found: true, battle: {...} } }
                // - No match: { success: true, data: { success: true, queue_position: N } }
                // - Error but might still have match data: { success: false, data: {...} }
                const hasMatch = result.data &&
                    typeof result.data === 'object' &&
                    'match_found' in result.data &&
                    result.data.match_found === true &&
                    result.data.battle

                if (hasMatch) {
                    // Match found! Notify client
                    const battleData = result.data.battle
                    client.battleId = battleData.battle_id
                    console.log(`[WEBSOCKET] Match found! Battle ID: ${battleData.battle_id}, Player1: ${battleData.player1_id}, Player2: ${battleData.player2_id}`)

                    // Determine which player is which
                    const isPlayer1 = battleData.player1_id === client.userId
                    const playerCharacter = isPlayer1
                        ? battleData.player1_character
                        : battleData.player2_character
                    const opponentCharacter = isPlayer1
                        ? battleData.player2_character
                        : battleData.player1_character
                    const opponentId = isPlayer1 ? battleData.player2_id : battleData.player1_id

                    // Find opponent client and notify both
                    const opponentClient = Array.from(clients.values()).find(
                        (c) => c.userId === opponentId && c.battleId === null
                    )

                    if (opponentClient) {
                        opponentClient.battleId = battleData.battle_id
                        console.log(`[WEBSOCKET] Opponent ${opponentId} is connected, notifying both players`)

                        // Notify both players
                        send(client.ws, {
                            type: 'match_found',
                            data: {
                                battle_id: battleData.battle_id,
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
                                turn: isPlayer1 ? 'player' : 'enemy',
                            },
                        })

                        send(opponentClient.ws, {
                            type: 'match_found',
                            data: {
                                battle_id: battleData.battle_id,
                                opponent: {
                                    id: client.userId!,
                                    name: playerCharacter.character.name,
                                    character: playerCharacter.character,
                                    status: playerCharacter.status,
                                    moves: playerCharacter.moves,
                                },
                                player_character: {
                                    character_user_id: opponentCharacter.character_user_id,
                                    character: opponentCharacter.character,
                                    status: opponentCharacter.status,
                                    moves: opponentCharacter.moves,
                                },
                                turn: isPlayer1 ? 'enemy' : 'player',
                            },
                        })
                    } else {
                        console.log(`[WEBSOCKET] Opponent ${opponentId} is NOT connected, only notifying current player`)
                        // Opponent not connected yet, but notify current player anyway
                        // They might connect later or the match will be handled via HTTP polling
                        send(client.ws, {
                            type: 'match_found',
                            data: {
                                battle_id: battleData.battle_id,
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
                                turn: isPlayer1 ? 'player' : 'enemy',
                            },
                        })
                    }
                } else {
                    // No match found yet - queue the user
                    // Check if result.data has queue_position (normal queue response)
                    // or if it's an error response
                    if (result.success === false) {
                        console.log(`[WEBSOCKET] Backend returned error, but checking if match was still created...`)
                        console.log(`[WEBSOCKET] Error details:`, result.message, result.error)

                        // Even if there's an error, check if we have match data
                        if (result.data && result.data.match_found && result.data.battle) {
                            console.log(`[WEBSOCKET] Match found despite error response! Processing match...`)
                            // Reprocess as if match was found - this will be handled by the hasMatch check above
                            // But since we're in the else block, we need to handle it here
                            const battleData = result.data.battle
                            client.battleId = battleData.battle_id
                            console.log(`[WEBSOCKET] Match found! Battle ID: ${battleData.battle_id}`)

                            // Process match (similar to the hasMatch block above)
                            const isPlayer1 = battleData.player1_id === client.userId
                            const playerCharacter = isPlayer1
                                ? battleData.player1_character
                                : battleData.player2_character
                            const opponentCharacter = isPlayer1
                                ? battleData.player2_character
                                : battleData.player1_character
                            const opponentId = isPlayer1 ? battleData.player2_id : battleData.player1_id

                            const opponentClient = Array.from(clients.values()).find(
                                (c) => c.userId === opponentId && c.battleId === null
                            )

                            if (opponentClient) {
                                opponentClient.battleId = battleData.battle_id
                                console.log(`[WEBSOCKET] Opponent ${opponentId} is connected, notifying both players`)

                                send(client.ws, {
                                    type: 'match_found',
                                    data: {
                                        battle_id: battleData.battle_id,
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
                                        turn: isPlayer1 ? 'player' : 'enemy',
                                    },
                                })

                                send(opponentClient.ws, {
                                    type: 'match_found',
                                    data: {
                                        battle_id: battleData.battle_id,
                                        opponent: {
                                            id: client.userId!,
                                            name: playerCharacter.character.name,
                                            character: playerCharacter.character,
                                            status: playerCharacter.status,
                                            moves: playerCharacter.moves,
                                        },
                                        player_character: {
                                            character_user_id: opponentCharacter.character_user_id,
                                            character: opponentCharacter.character,
                                            status: opponentCharacter.status,
                                            moves: opponentCharacter.moves,
                                        },
                                        turn: isPlayer1 ? 'enemy' : 'player',
                                    },
                                })
                            } else {
                                console.log(`[WEBSOCKET] Opponent ${opponentId} is NOT connected, only notifying current player`)
                                send(client.ws, {
                                    type: 'match_found',
                                    data: {
                                        battle_id: battleData.battle_id,
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
                                        turn: isPlayer1 ? 'player' : 'enemy',
                                    },
                                })
                            }
                            return // Match processed, don't start polling
                        } else {
                            // Real error, queue with fallback position
                            console.log(`[WEBSOCKET] Real error occurred, queueing with fallback`)
                            send(client.ws, {
                                type: 'matchmaking_queued',
                                message: 'Waiting for opponent...',
                                queue_position: 1,
                            })
                        }
                    } else {
                        // Normal queue response
                        const queuePosition = result.data?.queue_position ||
                            (result.data?.success ? result.data.queue_position : 1)
                        console.log(`[WEBSOCKET] User ${client.userId} queued for matchmaking, position: ${queuePosition}`)
                        send(client.ws, {
                            type: 'matchmaking_queued',
                            message: 'Waiting for opponent...',
                            queue_position: queuePosition,
                        })
                    }

                    // Start polling for matches every 2 seconds
                    if (client.matchmakingInterval) {
                        clearInterval(client.matchmakingInterval)
                    }

                    console.log(`[WEBSOCKET] Starting polling interval for user ${client.userId}`)
                    client.matchmakingInterval = setInterval(async () => {
                        if (client.battleId) {
                            // Already matched, stop polling
                            if (client.matchmakingInterval) {
                                clearInterval(client.matchmakingInterval)
                                client.matchmakingInterval = null
                            }
                            return
                        }

                        try {
                            const matchResponse = await fetch(
                                `${BACKEND_URL}/backend/battles/matchmaking/join`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        user_id: client.userId,
                                        character_user_id: client.characterUserId,
                                    }),
                                }
                            )

                            // Check HTTP status first
                            if (!matchResponse.ok) {
                                console.error(`[WEBSOCKET] Polling HTTP error! Status: ${matchResponse.status}`)
                                // Continue polling even if there's an error
                                return
                            }

                            const matchResult = await matchResponse.json()
                            console.log(`[WEBSOCKET] Polling result for user ${client.userId}:`, {
                                success: matchResult.success,
                                match_found: matchResult.data?.match_found,
                                has_battle: !!matchResult.data?.battle,
                                battle_id: matchResult.data?.battle?.battle_id,
                            })

                            // Log full response if match found
                            if (matchResult.success && matchResult.data?.match_found) {
                                console.log(`[WEBSOCKET] Full polling response:`, JSON.stringify(matchResult, null, 2))
                            }

                            // Check if match was found (even if success is false due to broadcast errors)
                            const hasMatch = matchResult.data &&
                                typeof matchResult.data === 'object' &&
                                'match_found' in matchResult.data &&
                                matchResult.data.match_found === true &&
                                matchResult.data.battle

                            if (hasMatch) {
                                // Match found!
                                const battleData = matchResult.data.battle
                                client.battleId = battleData.battle_id
                                console.log(`[WEBSOCKET] Match found via polling! Battle ID: ${battleData.battle_id}`)

                                if (client.matchmakingInterval) {
                                    clearInterval(client.matchmakingInterval)
                                    client.matchmakingInterval = null
                                }

                                // Determine which player is which
                                const isPlayer1 = battleData.player1_id === client.userId
                                const playerCharacter = isPlayer1
                                    ? battleData.player1_character
                                    : battleData.player2_character
                                const opponentCharacter = isPlayer1
                                    ? battleData.player2_character
                                    : battleData.player1_character
                                const opponentId = isPlayer1 ? battleData.player2_id : battleData.player1_id

                                // Find opponent client and notify both
                                const opponentClient = Array.from(clients.values()).find(
                                    (c) => c.userId === opponentId && c.battleId === null
                                )

                                if (opponentClient) {
                                    opponentClient.battleId = battleData.battle_id
                                    if (opponentClient.matchmakingInterval) {
                                        clearInterval(opponentClient.matchmakingInterval)
                                        opponentClient.matchmakingInterval = null
                                    }
                                    console.log(`[WEBSOCKET] Opponent ${opponentId} is connected via polling, notifying both players`)

                                    // Notify both players
                                    send(client.ws, {
                                        type: 'match_found',
                                        data: {
                                            battle_id: battleData.battle_id,
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
                                            turn: isPlayer1 ? 'player' : 'enemy',
                                        },
                                    })

                                    send(opponentClient.ws, {
                                        type: 'match_found',
                                        data: {
                                            battle_id: battleData.battle_id,
                                            opponent: {
                                                id: client.userId!,
                                                name: playerCharacter.character.name,
                                                character: playerCharacter.character,
                                                status: playerCharacter.status,
                                                moves: playerCharacter.moves,
                                            },
                                            player_character: {
                                                character_user_id: opponentCharacter.character_user_id,
                                                character: opponentCharacter.character,
                                                status: opponentCharacter.status,
                                                moves: opponentCharacter.moves,
                                            },
                                            turn: isPlayer1 ? 'enemy' : 'player',
                                        },
                                    })
                                } else {
                                    console.log(`[WEBSOCKET] Opponent ${opponentId} is NOT connected via polling, only notifying current player`)
                                    // Opponent not connected, but notify current player
                                    send(client.ws, {
                                        type: 'match_found',
                                        data: {
                                            battle_id: battleData.battle_id,
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
                                            turn: isPlayer1 ? 'player' : 'enemy',
                                        },
                                    })
                                }
                            }
                        } catch (error) {
                            console.error('Error polling for match:', error)
                        }
                    }, 2000) // Poll every 2 seconds
                }
            } catch (error) {
                console.error('Error joining matchmaking:', error)
                sendError(client.ws, 'Failed to join matchmaking')
            }
            break

        case 'leave_matchmaking':
            if (client.matchmakingInterval) {
                clearInterval(client.matchmakingInterval)
                client.matchmakingInterval = null
            }
            if (client.userId) {
                try {
                    await fetch(`${BACKEND_URL}/backend/battles/matchmaking/leave`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            user_id: client.userId,
                        }),
                    })
                } catch (error) {
                    console.error('Error leaving matchmaking:', error)
                }
            }
            break

        case 'battle_attack':
            if (!client.battleId || !client.userId) {
                sendError(client.ws, 'Not in a battle')
                return
            }

            // Forward attack to Laravel API
            try {
                const response = await fetch(
                    `${BACKEND_URL}/backend/battles/${client.battleId}/attack`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            user_id: client.userId,
                            move_id: data.data?.move_id,
                        }),
                    }
                )

                const result = await response.json()

                if (result.success && result.data) {
                    // Find opponent and notify them
                    const opponentClient = Array.from(clients.values()).find(
                        (c) =>
                            c.battleId === client.battleId &&
                            c.userId !== client.userId &&
                            c.userId !== null
                    )

                    if (opponentClient) {
                        send(opponentClient.ws, {
                            type: 'battle_attack',
                            battle_id: client.battleId,
                            data: {
                                battle_id: client.battleId,
                                attacker_id: client.userId,
                                move_id: data.data?.move_id,
                                move_name: result.data.move_name || 'Attack',
                                damage: result.data.damage || 0,
                                target_hp: result.data.enemy_current_hp || 0,
                                turn: result.data.turn || 'enemy',
                                battle_ended: result.data.is_finished || false,
                                winner_id: result.data.winner_id || null,
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
                            move_id: data.data?.move_id,
                            move_name: result.data.move_name || 'Attack',
                            damage: result.data.damage || 0,
                            target_hp: result.data.enemy_current_hp || 0,
                            turn: result.data.turn || 'player',
                            battle_ended: result.data.is_finished || false,
                            winner_id: result.data.winner_id || null,
                        },
                    })
                } else {
                    sendError(client.ws, result.message || 'Attack failed')
                }
            } catch (error) {
                console.error('Error executing attack:', error)
                sendError(client.ws, 'Failed to execute attack')
            }
            break

        default:
            sendError(client.ws, `Unknown message type: ${data.type}`)
    }
}

function send(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
    }
}

function sendError(ws: WebSocket, message: string) {
    send(ws, { type: 'error', message })
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[WEBSOCKET] ========================================`)
    console.log(`[WEBSOCKET] WebSocket server started successfully`)
    console.log(`[WEBSOCKET] Listening on port ${PORT}`)
    console.log(`[WEBSOCKET] Listening on 0.0.0.0:${PORT} (accepting external connections)`)
    console.log(`[WEBSOCKET] Backend URL: ${BACKEND_URL}`)
    console.log(`[WEBSOCKET] Environment BACKEND_URL: ${process.env.BACKEND_URL || 'not set'}`)
    console.log(`[WEBSOCKET] ========================================`)
    console.log(`[WEBSOCKET] Waiting for client connections...`)
})
