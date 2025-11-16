import { WebSocketServer, WebSocket } from 'ws'
import * as http from 'http'

// Get backend URL from environment or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'
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
const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection')

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
            await handleMessage(client, data)
        } catch (error) {
            console.error('Error handling message:', error)
            sendError(ws, 'Invalid message format')
        }
    })

    ws.on('close', () => {
        console.log('WebSocket connection closed')
        // Clear matchmaking interval if exists
        if (client.matchmakingInterval) {
            clearInterval(client.matchmakingInterval)
        }
        clients.delete(ws)
    })

    ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        clients.delete(ws)
    })
})

async function handleMessage(client: Client, data: any) {
    switch (data.type) {
        case 'auth':
            client.userId = data.data?.user_id || null
            send(client.ws, { type: 'auth_success', message: 'Authenticated' })
            break

        case 'join_matchmaking':
            if (!client.userId || !data.data?.character_user_id) {
                sendError(client.ws, 'User ID and character ID required')
                return
            }

            client.characterUserId = data.data.character_user_id

            // Call Laravel API to join matchmaking
            try {
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

                const result = await response.json()

                if (result.success && result.data?.match_found && result.data?.battle) {
                    // Match found! Notify client
                    const battleData = result.data.battle
                    client.battleId = battleData.battle_id

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
                    }
                } else {
                    send(client.ws, {
                        type: 'matchmaking_queued',
                        message: 'Waiting for opponent...',
                        queue_position: result.data?.queue_position || 1,
                    })

                    // Start polling for matches every 2 seconds
                    if (client.matchmakingInterval) {
                        clearInterval(client.matchmakingInterval)
                    }

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

                            const matchResult = await matchResponse.json()

                            if (matchResult.success && matchResult.data?.match_found && matchResult.data?.battle) {
                                // Match found!
                                const battleData = matchResult.data.battle
                                client.battleId = battleData.battle_id

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

server.listen(PORT, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`)
    console.log(`Backend URL: ${BACKEND_URL}`)
})
