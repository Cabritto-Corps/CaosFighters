import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import BattleAttackButton from '../components/ui/BattleAttackButton'
import ChaosButton from '../components/ui/ChaosButton'
import ChaoticBackground from '../components/ui/ChaoticBackground'
import MoveDetailModal, { MoveDetail } from '../components/ui/MoveDetailModal'
import { useAuth } from '../hooks/useAuth'
import { apiService } from '../services/api'
import { websocketService } from '../services/websocket'
import type { BattleAttackWebSocketData, BattleMode, WebSocketMessage } from '../types/battle'

const { width, height } = Dimensions.get('window')

export default function BattleScreen() {
    const router = useRouter()
    const params = useLocalSearchParams()
    const { user } = useAuth()

    // Determine battle mode
    const battleMode: BattleMode = (params.battleMode as BattleMode) || 'bot'
    const isMultiplayer = battleMode === 'multiplayer'

    // Parse player and enemy stats and moves from params
    type Stats = { hp: number; strength: number; defense: number; agility: number }
    type BattleMove = { id: number; name: string; power: number }
    type PlayerMove = {
        id: number
        name: string
        power?: number
        accuracy?: number
        effect_chance?: number
        effect?: string
        type?: string
    }

    let playerStats: Stats
    let enemyStats: Stats

    const playerStatsJSON = params.playerStats as string
    playerStats = JSON.parse(playerStatsJSON)

    const enemyStatsJSON = params.enemyStats as string
    enemyStats = JSON.parse(enemyStatsJSON)

    // Parse player moves from backend
    const playerMovesJSON = params.playerMoves as string
    const playerMoves: PlayerMove[] = JSON.parse(playerMovesJSON)

    // Parse enemy moves from backend
    const enemyMovesJSON = params.enemyMoves as string
    const enemyMoves: BattleMove[] = JSON.parse(enemyMovesJSON)

    // Dados do inimigo e jogador (do backend)
    const enemy = {
        name: params.enemyName as string,
        image: params.enemyIcon as string,
        maxHP: enemyStats.hp,
        stats: enemyStats,
    }

    const player = {
        name: params.playerName as string,
        image: params.playerIcon as string,
        maxHP: playerStats.hp,
        stats: playerStats,
    }

    // Estados da batalha
    const [playerHP, setPlayerHP] = useState(playerStats.hp)
    const [enemyHP, setEnemyHP] = useState(enemyStats.hp)
    const [turn, setTurn] = useState<'player' | 'enemy'>('player')
    const [battleLog, setBattleLog] = useState<string[]>([])
    const [battleEnded, setBattleEnded] = useState(false)
    const [winner, setWinner] = useState<'player' | 'enemy' | null>(null)
    const [currentDamage, setCurrentDamage] = useState(0)
    const [selectedMove, setSelectedMove] = useState<MoveDetail | null>(null)
    const [waitingForOpponent, setWaitingForOpponent] = useState(false)
    const [isProcessingAction, setIsProcessingAction] = useState(false)

    // Battle timing
    const battleStartTimeRef = useRef<number>(Date.now())
    const websocketUnsubscribeRef = useRef<(() => void) | null>(null)
    const battlePollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastWebSocketMessageRef = useRef<number>(Date.now())
    const lastPolledBattleLogLengthRef = useRef<number>(0)

    // Animações
    const fadeAnim = useRef(new Animated.Value(0)).current
    const shakeAnimPlayer = useRef(new Animated.Value(0)).current
    const shakeAnimEnemy = useRef(new Animated.Value(0)).current
    const battleAnimScale = useRef(new Animated.Value(1)).current

    // Novas animações de ataque
    const attackEffectOpacity = useRef(new Animated.Value(0)).current
    const attackEffectScale = useRef(new Animated.Value(0.5)).current
    const attackEffectRotation = useRef(new Animated.Value(0)).current
    const damageTextOpacity = useRef(new Animated.Value(0)).current
    const damageTextTranslateY = useRef(new Animated.Value(0)).current
    const damageTextScale = useRef(new Animated.Value(0.5)).current
    const screenFlashOpacity = useRef(new Animated.Value(0)).current
    const characterAttackScale = useRef(new Animated.Value(1)).current
    const characterAttackRotation = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start()

        setBattleLog([`A batalha entre você e ${enemy.name} começou!`])

        // Setup WebSocket for multiplayer battles
        if (isMultiplayer && user?.id) {
            const battleId = params.battleId as string

            const setupWebSocket = async () => {
                // Initialize WebSocket message tracking
                lastWebSocketMessageRef.current = Date.now()

                // Ensure WebSocket is connected
                if (!websocketService.isConnected()) {
                    await websocketService.connect(user.id)
                }

                // Subscribe to battle channel
                websocketService.subscribeToBattle(battleId)

                // Set up message handler for battle events
                const unsubscribe = websocketService.onMessage((message: WebSocketMessage) => {
                    handleWebSocketMessage(message)
                })

                websocketUnsubscribeRef.current = unsubscribe
            }

            setupWebSocket()

            // Return cleanup function
            return () => {
                if (websocketUnsubscribeRef.current) {
                    websocketUnsubscribeRef.current()
                }
                websocketService.unsubscribeFromBattle(battleId)
                // Clear polling interval
                if (battlePollingIntervalRef.current) {
                    clearInterval(battlePollingIntervalRef.current)
                    battlePollingIntervalRef.current = null
                }
            }
        }
    }, [])

    const handleWebSocketMessage = (message: WebSocketMessage) => {
        console.log(`[BATTLE] ========================================`)
        console.log(`[BATTLE] handleWebSocketMessage called`)
        console.log(`[BATTLE] Message battle_id: ${message.battle_id}`)
        console.log(`[BATTLE] Params battleId: ${params.battleId}`)
        console.log(`[BATTLE] Match: ${message.battle_id === params.battleId}`)
        console.log(`[BATTLE] Message type: ${message.type}`)
        console.log(`[BATTLE] ========================================`)

        if (message.battle_id !== params.battleId) {
            console.log(`[BATTLE] Message filtered out - battle_id mismatch`)
            return // Not for this battle
        }

        console.log(`[BATTLE] ========================================`)
        console.log(`[BATTLE] WebSocket message received`)
        console.log(`[BATTLE] Type: ${message.type}`)
        console.log(`[BATTLE] Battle ID: ${message.battle_id}`)
        console.log(`[BATTLE] Current turn: ${turn}`)
        console.log(`[BATTLE] Is processing action: ${isProcessingAction}`)
        console.log(`[BATTLE] Message data:`, JSON.stringify(message.data, null, 2))
        console.log(`[BATTLE] ========================================`)

        // Update last WebSocket message time - if we're receiving messages, stop polling
        lastWebSocketMessageRef.current = Date.now()

        // Stop polling if we're receiving WebSocket messages (connection is working)
        if (battlePollingIntervalRef.current) {
            console.log(`[BATTLE] Stopping polling - WebSocket messages are working`)
            clearInterval(battlePollingIntervalRef.current)
            battlePollingIntervalRef.current = null
        }

        switch (message.type) {
            case 'battle_attack':
                if (message.data) {
                    const attackData = message.data as BattleAttackWebSocketData
                    const isPlayerAttack = attackData.attacker_id === params.playerId

                    console.log(`[BATTLE] Processing battle_attack message`)
                    console.log(`[BATTLE] Attacker ID: ${attackData.attacker_id}`)
                    console.log(`[BATTLE] Player ID: ${params.playerId}`)
                    console.log(`[BATTLE] Is player attack: ${isPlayerAttack}`)
                    console.log(`[BATTLE] Turn in message: ${attackData.turn}`)
                    console.log(`[BATTLE] Damage: ${attackData.damage}`)
                    console.log(`[BATTLE] Target HP: ${attackData.target_hp}`)
                    console.log(`[BATTLE] Battle ended: ${attackData.battle_ended}`)

                    if (isPlayerAttack) {
                        console.log(`[BATTLE] This is the player's own attack confirmation`)

                        // Update HP first (before checking if battle ended)
                        if (attackData.target_hp !== undefined) {
                            console.log(`[BATTLE] Updating enemy HP to: ${attackData.target_hp}`)
                            setEnemyHP(attackData.target_hp)
                        }

                        // Check if battle ended FIRST - this takes priority
                        if (attackData.battle_ended && attackData.winner_id) {
                            console.log(`[BATTLE] Battle ended! Winner: ${attackData.winner_id}`)
                            setBattleEnded(true)
                            setWinner(attackData.winner_id === params.playerId ? 'player' : 'enemy')
                            setIsProcessingAction(false)
                            setWaitingForOpponent(false)
                            // Stop polling if active
                            if (battlePollingIntervalRef.current) {
                                clearInterval(battlePollingIntervalRef.current)
                                battlePollingIntervalRef.current = null
                            }
                            setBattleLog((prev) => [
                                ...prev,
                                `Você usou ${attackData.move_name} e causou ${attackData.damage} de dano!`,
                                attackData.winner_id === params.playerId ? 'Você venceu!' : 'Você perdeu!',
                            ])
                            return // Exit early - battle is over
                        }

                        // Battle didn't end - update turn state
                        if (attackData.turn === 'enemy') {
                            console.log(`[BATTLE] Turn changed to enemy - waiting for opponent`)
                            // Opponent's turn now
                            setWaitingForOpponent(true)
                            setIsProcessingAction(false) // Unlock input (but show waiting message)
                            setBattleLog((prev) => [
                                ...prev,
                                `Você usou ${attackData.move_name} e causou ${attackData.damage} de dano!`,
                            ])
                        } else if (attackData.turn === 'player') {
                            console.log(`[BATTLE] Turn changed back to player - unlocking input`)
                            // Back to player's turn - unlock input
                            setIsProcessingAction(false)
                            setWaitingForOpponent(false)
                            setBattleLog((prev) => [
                                ...prev,
                                `Você usou ${attackData.move_name} e causou ${attackData.damage} de dano!`,
                            ])
                        }
                    } else {
                        console.log(`[BATTLE] This is opponent's attack - calling handleOpponentAttack`)
                        // Opponent's attack
                        handleOpponentAttack(attackData)
                    }
                }
                break
            case 'battle_state_update':
                if (message.data) {
                    const stateData = message.data as any
                    if (stateData.player_hp !== undefined) setPlayerHP(stateData.player_hp)
                    if (stateData.enemy_hp !== undefined) setEnemyHP(stateData.enemy_hp)
                    if (stateData.turn) {
                        setTurn(stateData.turn)
                        // Unlock input when it's player's turn
                        if (stateData.turn === 'player') {
                            setIsProcessingAction(false)
                        }
                    }
                }
                break
            case 'battle_end':
                if (message.data) {
                    const endData = message.data as any
                    setBattleEnded(true)
                    setWinner(endData.winner_id === params.playerId ? 'player' : 'enemy')
                    setBattleLog((prev) => [...prev, endData.message || 'Batalha finalizada!'])
                    setIsProcessingAction(false)
                }
                break
            case 'error':
                console.error(`[BATTLE] ========================================`)
                console.error(`[BATTLE] Error received from WebSocket server`)
                console.error(`[BATTLE] Error message: ${message.message}`)
                console.error(`[BATTLE] Battle ID: ${message.battle_id}`)
                console.error(`[BATTLE] ========================================`)
                // Unlock input if attack failed (e.g., not player's turn)
                if (message.battle_id === params.battleId && isProcessingAction) {
                    console.log(`[BATTLE] Unlocking input due to error - attack may have failed`)
                    setIsProcessingAction(false)
                    // Don't change turn - keep current turn state
                    setBattleLog((prev) => [...prev, `Erro: ${message.message || 'Falha ao executar ataque'}`])
                }
                break
        }
    }

    const handleOpponentAttack = (attackData: BattleAttackWebSocketData) => {
        console.log(`[BATTLE] ========================================`)
        console.log(`[BATTLE] Handling opponent attack`)
        console.log(`[BATTLE] Current turn: ${turn}`)
        console.log(`[BATTLE] Attack data:`, JSON.stringify(attackData, null, 2))
        console.log(`[BATTLE] Current player HP: ${playerHP}`)
        console.log(`[BATTLE] Current enemy HP: ${enemyHP}`)
        console.log(`[BATTLE] ========================================`)

        // Update enemy HP (which is actually the opponent's HP in multiplayer)
        // Note: In multiplayer, target_hp is the HP of the target (player's HP when opponent attacks)
        // So we need to update playerHP, not enemyHP
        if (attackData.target_hp !== undefined) {
            console.log(`[BATTLE] Updating player HP to: ${attackData.target_hp}`)
            setPlayerHP(attackData.target_hp)
        }
        setCurrentDamage(attackData.damage)
        animateAttack('enemy', 'player', attackData.damage)

        // Check if battle ended FIRST - this takes priority
        if (attackData.battle_ended && attackData.winner_id) {
            console.log(`[BATTLE] Battle ended! Winner: ${attackData.winner_id}`)
            setBattleEnded(true)
            setWinner(attackData.winner_id === params.playerId ? 'player' : 'enemy')
            setIsProcessingAction(false)
            setWaitingForOpponent(false)
            // Stop polling if active
            if (battlePollingIntervalRef.current) {
                clearInterval(battlePollingIntervalRef.current)
                battlePollingIntervalRef.current = null
            }
            setBattleLog((prev) => [
                ...prev,
                `${enemy.name} usou ${attackData.move_name} e causou ${attackData.damage} de dano!`,
                attackData.winner_id === params.playerId ? 'Você venceu!' : 'Você perdeu!',
            ])
            return // Exit early - battle is over
        }

        // Battle didn't end - update turn and log
        setBattleLog((prev) => [
            ...prev,
            `${enemy.name} usou ${attackData.move_name} e causou ${attackData.damage} de dano!`,
        ])

        // Update turn
        console.log(`[BATTLE] Updating turn from ${turn} to ${attackData.turn}`)
        setTurn(attackData.turn)

        // Unlock input when opponent's turn is confirmed
        if (attackData.turn === 'player') {
            console.log(`[BATTLE] Unlocking input - it's player's turn now`)
            setIsProcessingAction(false)
            setWaitingForOpponent(false)
        } else {
            // Still opponent's turn
            setWaitingForOpponent(true)
        }
    }

    useEffect(() => {
        if (playerHP <= 0) {
            setBattleEnded(true)
            setWinner('enemy')
            setBattleLog((prev) => [...prev, `Você foi derrotado por ${enemy.name}!`])
        } else if (enemyHP <= 0) {
            setBattleEnded(true)
            setWinner('player')
            setBattleLog((prev) => [...prev, `Você derrotou ${enemy.name}!`])
        }
    }, [playerHP, enemyHP])

    useEffect(() => {
        if (turn === 'enemy' && !battleEnded && !isMultiplayer) {
            // IA simples do inimigo (only for bot mode)
            const timer = setTimeout(() => {
                enemyAttack()
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [turn, battleEnded, isMultiplayer])

    // Polling fallback for multiplayer battles when waiting for opponent
    // Only polls if WebSocket messages haven't been received recently (connection might be down)
    useEffect(() => {
        if (isMultiplayer && turn === 'enemy' && !battleEnded && user?.id) {
            const battleId = params.battleId as string

            // Only start polling if we haven't received WebSocket messages in the last 5 seconds
            // This prevents unnecessary polling when WebSocket is working
            const checkAndStartPolling = () => {
                const timeSinceLastWebSocket = Date.now() - lastWebSocketMessageRef.current
                const shouldPoll = timeSinceLastWebSocket > 5000 // Only poll if no WebSocket messages for 5+ seconds

                if (!shouldPoll) {
                    // WebSocket is working, don't poll
                    return
                }

                // Clear existing polling if any
                if (battlePollingIntervalRef.current) {
                    clearInterval(battlePollingIntervalRef.current)
                    battlePollingIntervalRef.current = null
                }

                // Start polling every 5 seconds (less frequent to reduce server load)
                battlePollingIntervalRef.current = setInterval(async () => {
                    // Check again if WebSocket is working before polling
                    const timeSinceLastWebSocket = Date.now() - lastWebSocketMessageRef.current
                    if (timeSinceLastWebSocket < 5000) {
                        // WebSocket is working now, stop polling
                        if (battlePollingIntervalRef.current) {
                            clearInterval(battlePollingIntervalRef.current)
                            battlePollingIntervalRef.current = null
                        }
                        return
                    }

                    try {
                        const battleDetails = await apiService.getBattleDetails(battleId, user.id)
                        if (battleDetails.success && battleDetails.data) {
                            const battleData = battleDetails.data
                            const battleLog = battleData.battle_log || []

                            // Only process if battle log has changed
                            if (battleLog.length > lastPolledBattleLogLengthRef.current) {
                                lastPolledBattleLogLengthRef.current = battleLog.length

                                // Check if battle ended
                                if (battleData.winner_id) {
                                    setBattleEnded(true)
                                    setWinner(battleData.winner_id === params.playerId ? 'player' : 'enemy')
                                    if (battlePollingIntervalRef.current) {
                                        clearInterval(battlePollingIntervalRef.current)
                                        battlePollingIntervalRef.current = null
                                    }
                                    setIsProcessingAction(false)
                                    return
                                }

                                // Update turn if it changed (opponent might have attacked)
                                // Note: We can't fully sync state from polling, but we can detect if turn changed
                                // The WebSocket should handle the actual state updates
                            }
                        }
                    } catch (error) {
                        // Ignore polling errors - WebSocket should handle updates
                        console.error('[BATTLE] Polling error:', error)
                    }
                }, 5000) // Poll every 5 seconds (less frequent)
            }

            // Start checking after a delay (give WebSocket time to work first)
            const initialDelay = setTimeout(() => {
                checkAndStartPolling()
            }, 5000) // Wait 5 seconds before starting to poll

            return () => {
                clearTimeout(initialDelay)
                if (battlePollingIntervalRef.current) {
                    clearInterval(battlePollingIntervalRef.current)
                    battlePollingIntervalRef.current = null
                }
            }
        } else {
            // Clear polling when it's player's turn or battle ended
            if (battlePollingIntervalRef.current) {
                clearInterval(battlePollingIntervalRef.current)
                battlePollingIntervalRef.current = null
            }
        }
    }, [turn, battleEnded, isMultiplayer, user?.id, params.battleId, params.playerId])

    const animateAttack = (attacker: 'player' | 'enemy', target: 'player' | 'enemy', damage: number) => {
        const targetAnim = target === 'player' ? shakeAnimPlayer : shakeAnimEnemy

        // Definir o dano atual para exibição
        setCurrentDamage(damage)

        // Reset das animações
        attackEffectOpacity.setValue(0)
        attackEffectScale.setValue(0.5)
        attackEffectRotation.setValue(0)
        damageTextOpacity.setValue(0)
        damageTextTranslateY.setValue(0)
        damageTextScale.setValue(0.5)
        screenFlashOpacity.setValue(0)
        characterAttackScale.setValue(1)
        characterAttackRotation.setValue(0)

        // Animação simplificada para evitar conflitos
        Animated.parallel([
            // Shake do alvo
            Animated.sequence([
                Animated.timing(targetAnim, {
                    toValue: 10,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(targetAnim, {
                    toValue: -10,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(targetAnim, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]),

            // Efeito visual simples
            Animated.sequence([
                Animated.timing(attackEffectOpacity, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(attackEffectOpacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]),

            // Texto de dano
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(damageTextOpacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(damageTextScale, {
                        toValue: 1.2,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(damageTextTranslateY, {
                        toValue: -20,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(damageTextOpacity, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ]),
            ]),
        ]).start()
    }

    const playerAttack = async (attack: PlayerMove) => {
        if (turn !== 'player' || battleEnded || isProcessingAction) return

        // Lock input immediately to prevent multiple clicks
        setIsProcessingAction(true)

        if (isMultiplayer) {
            // Multiplayer mode - send attack via WebSocket if using custom server, otherwise HTTP API
            const battleId = params.battleId as string
            try {
                console.log(`[BATTLE] ========================================`)
                console.log(`[BATTLE] Sending attack request`)
                console.log(`[BATTLE] Battle ID: ${battleId}`)
                console.log(`[BATTLE] Move ID: ${attack.id}`)
                console.log(`[BATTLE] Move Name: ${attack.name}`)
                console.log(`[BATTLE] Current turn: ${turn}`)
                console.log(`[BATTLE] Player ID: ${params.playerId}`)
                console.log(`[BATTLE] WebSocket connected: ${websocketService.isConnected()}`)
                console.log(`[BATTLE] ========================================`)

                // Update last WebSocket message time optimistically (we expect a response soon)
                lastWebSocketMessageRef.current = Date.now()

                // If using custom WebSocket server, send via WebSocket
                // Otherwise, use HTTP API (Reverb will broadcast events)
                if (websocketService.isConnected()) {
                    console.log(`[BATTLE] Sending attack via WebSocket`)
                    websocketService.sendAttack(battleId, attack.id.toString())
                    setWaitingForOpponent(true)
                    setTurn('enemy') // Optimistically set turn, will be confirmed by server
                    console.log(`[BATTLE] Attack sent via WebSocket, waiting for confirmation`)
                } else {
                    console.log(`[BATTLE] WebSocket not connected, using HTTP API`)
                    const attackResponse = await apiService.executeAttack(battleId, attack.id.toString())
                    console.log(`[BATTLE] Attack API response received:`, JSON.stringify(attackResponse, null, 2))
                    setWaitingForOpponent(true)
                    setTurn('enemy') // Optimistically set turn, will be confirmed by server
                    console.log(`[BATTLE] Turn optimistically set to 'enemy', waiting for WebSocket confirmation`)
                }
            } catch (error) {
                console.error(`[BATTLE] ========================================`)
                console.error(`[BATTLE] Failed to execute attack:`, error)
                console.error(`[BATTLE] Battle ID: ${battleId}`)
                console.error(`[BATTLE] Move ID: ${attack.id}`)
                console.error(`[BATTLE] ========================================`)
                // Unlock on error so user can try again
                setIsProcessingAction(false)
                setTurn('player')
            }
        } else {
            // Bot mode - calculate damage locally
            const basePower = attack.power ?? 0

            if (basePower > 0) {
                // Stat-based damage calculation: power + (attacker.strength - defender.defense) * 0.1
                const attackerStrength = player.stats.strength
                const defenderDefense = enemy.stats.defense
                const statsModifier = (attackerStrength - defenderDefense) * 0.1

                // Add ±15% variance for randomness
                const variance = Math.random() * 0.3 - 0.15
                const damage = Math.max(1, Math.floor((basePower + statsModifier) * (1 + variance)))

                // Ataque
                setEnemyHP((prev) => Math.max(0, prev - damage))
                setBattleLog((prev) => [...prev, `Você usou ${attack.name} e causou ${damage} de dano!`])
                animateAttack('player', 'enemy', damage)
            } else {
                // Cura (poder negativo)
                const healing = Math.abs(basePower)
                setPlayerHP((prev) => Math.min(player.maxHP, prev + healing))
                setBattleLog((prev) => [...prev, `Você usou ${attack.name} e curou ${healing} HP!`])
                animateAttack('player', 'player', healing)
            }

            setTurn('enemy')
            setIsProcessingAction(false) // Unlock for bot mode (turn changes immediately)
        }
    }

    const enemyAttack = () => {
        // Select random move from enemy's move list
        const randomMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)]

        // Stat-based damage calculation: power + (attacker.strength - defender.defense) * 0.1
        const basePower = randomMove.power
        const attackerStrength = enemy.stats.strength
        const defenderDefense = player.stats.defense
        const statsModifier = (attackerStrength - defenderDefense) * 0.1

        // Add ±15% variance for randomness
        const variance = Math.random() * 0.3 - 0.15
        const damage = Math.max(1, Math.floor((basePower + statsModifier) * (1 + variance)))

        setPlayerHP((prev) => Math.max(0, prev - damage))
        setBattleLog((prev) => [...prev, `${enemy.name} usou ${randomMove.name} e causou ${damage} de dano!`])
        animateAttack('enemy', 'player', damage)

        setTurn('player')
    }

    const handleEndBattle = async () => {
        try {
            const battleId = params.battleId as string
            const playerId = params.playerId as string
            const botId = params.botId as string

            // Use actual user IDs for winner
            const winnerId = winner === 'player' ? playerId : botId

            // Calculate battle duration in seconds
            const durationSeconds = Math.floor((Date.now() - battleStartTimeRef.current) / 1000)

            // Call backend to save battle results
            await apiService.endBattle(battleId, winnerId, durationSeconds, battleLog)

            console.log('Battle ended successfully:', { battleId, winnerId, durationSeconds, battleLog })
        } catch (error) {
            console.error('Error ending battle:', error)
        } finally {
            // Navigate back regardless of success/failure
            router.back()
        }
    }

    const getHPColor = (hp: number) => {
        if (hp > 60) return '#00FF88'
        if (hp > 30) return '#FFD700'
        return '#FF6B6B'
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <ChaoticBackground
                colors={['#0a0a0a', '#1a0a0a', '#2a1a1a']}
                particleCount={40}
                particleColors={['#FF6B6B', '#FFD700', '#FF4444', '#FFA500']}
                animated={true}
            />

            {/* Flash da tela durante ataques */}
            <Animated.View style={[styles.screenFlash, { opacity: screenFlashOpacity }]} />

            {/* Efeito visual de ataque */}
            <Animated.View
                style={[
                    styles.attackEffect,
                    {
                        opacity: attackEffectOpacity,
                        transform: [
                            { scale: attackEffectScale },
                            {
                                rotate: attackEffectRotation.interpolate({
                                    inputRange: [0, 360],
                                    outputRange: ['0deg', '360deg'],
                                }),
                            },
                        ],
                    },
                ]}
            >
                <Text style={styles.attackEffectText}>⚡</Text>
            </Animated.View>

            <Animated.View
                style={[styles.battleContainer, { opacity: fadeAnim, transform: [{ scale: battleAnimScale }] }]}
            >
                {/* HUD Superior - Inimigo (Esquerda) */}
                <View style={[styles.hudContainer, styles.hudLeft]}>
                    <View style={styles.hudContent}>
                        <Text style={styles.characterName}>{enemy.name}</Text>
                        <View style={styles.hpContainer}>
                            <View style={styles.hpBarBg}>
                                <View
                                    style={[
                                        styles.hpBar,
                                        {
                                            width: `${(enemyHP / enemy.maxHP) * 100}%`,
                                            backgroundColor: getHPColor((enemyHP / enemy.maxHP) * 100),
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.hpText, { color: getHPColor((enemyHP / enemy.maxHP) * 100) }]}>
                                {enemyHP}/{enemy.maxHP}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* HUD Superior - Jogador (Direita) */}
                <View style={[styles.hudContainer, styles.hudRight]}>
                    <View style={styles.hudContent}>
                        <Text style={styles.characterName}>{player.name}</Text>
                        <View style={styles.hpContainer}>
                            <View style={styles.hpBarBg}>
                                <View
                                    style={[
                                        styles.hpBar,
                                        {
                                            width: `${(playerHP / player.maxHP) * 100}%`,
                                            backgroundColor: getHPColor((playerHP / player.maxHP) * 100),
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.hpText, { color: getHPColor((playerHP / player.maxHP) * 100) }]}>
                                {playerHP}/{player.maxHP}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Arena Central - Personagens */}
                <View style={styles.arena}>
                    {/* Inimigo */}
                    <Animated.View
                        style={[
                            styles.characterContainer,
                            styles.enemyContainer,
                            {
                                transform: [
                                    { translateX: shakeAnimEnemy },
                                    { scale: characterAttackScale },
                                    {
                                        rotate: characterAttackRotation.interpolate({
                                            inputRange: [-15, 15],
                                            outputRange: ['-15deg', '15deg'],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        {enemy.image ? (
                            <Image
                                source={{ uri: enemy.image }}
                                style={[styles.characterSprite, { opacity: enemyHP > 0 ? 1 : 0.3 }]}
                                resizeMode="contain"
                            />
                        ) : (
                            <View
                                style={[
                                    styles.characterSprite,
                                    {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    },
                                ]}
                            >
                                <Text style={{ fontSize: 40, color: '#FFD700' }}>?</Text>
                            </View>
                        )}
                    </Animated.View>

                    {/* Indicador de Turno */}
                    <View style={styles.turnIndicator}>
                        <Text
                            style={[
                                styles.turnText,
                                {
                                    color: turn === 'player' ? '#00FF88' : '#FF6B6B',
                                },
                            ]}
                        >
                            {battleEnded
                                ? winner === 'player'
                                    ? 'VITÓRIA!'
                                    : 'DERROTA!'
                                : turn === 'player'
                                  ? 'SEU TURNO'
                                  : 'TURNO INIMIGO'}
                        </Text>
                    </View>

                    {/* Jogador */}
                    <Animated.View
                        style={[
                            styles.characterContainer,
                            styles.playerContainer,
                            {
                                transform: [
                                    { translateX: shakeAnimPlayer },
                                    { scale: characterAttackScale },
                                    {
                                        rotate: characterAttackRotation.interpolate({
                                            inputRange: [-15, 15],
                                            outputRange: ['-15deg', '15deg'],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        {player.image ? (
                            <Image
                                source={{ uri: player.image }}
                                style={[styles.characterSprite, { opacity: playerHP > 0 ? 1 : 0.3 }]}
                                resizeMode="contain"
                            />
                        ) : (
                            <View
                                style={[
                                    styles.characterSprite,
                                    {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    },
                                ]}
                            >
                                <Text style={{ fontSize: 40, color: '#FFD700' }}>?</Text>
                            </View>
                        )}
                    </Animated.View>
                </View>

                {/* Texto de dano flutuante */}
                <Animated.View
                    style={[
                        styles.damageText,
                        {
                            opacity: damageTextOpacity,
                            transform: [{ translateY: damageTextTranslateY }, { scale: damageTextScale }],
                        },
                    ]}
                >
                    <Text style={styles.damageTextContent}>-{currentDamage}</Text>
                </Animated.View>

                {/* Battle Log - Últimas ações */}
                <View style={styles.battleLogContainer}>
                    <View style={styles.battleLogContent}>
                        {battleLog.slice(-2).map((log, idx) => (
                            <Text key={idx} style={styles.battleLogText} numberOfLines={1}>
                                • {log}
                            </Text>
                        ))}
                    </View>
                </View>

                {/* Ataques - Grid na parte inferior */}
                <View style={styles.attacksContainer}>
                    {!battleEnded ? (
                        <>
                            {turn === 'player' && (
                                <View style={styles.attacksGrid}>
                                    {playerMoves.map((attack, index) => (
                                        <View key={attack.id} style={styles.attackWrapper}>
                                            <BattleAttackButton
                                                attack={attack}
                                                onPress={() => playerAttack(attack)}
                                                onLongPress={() =>
                                                    setSelectedMove({
                                                        id: attack.id,
                                                        name: attack.name,
                                                        power: attack.power,
                                                        accuracy: attack.accuracy,
                                                        effect_chance: attack.effect_chance,
                                                        effect: attack.effect,
                                                        type: attack.type,
                                                    })
                                                }
                                                disabled={isProcessingAction}
                                                delay={index * 120}
                                            />
                                        </View>
                                    ))}
                                </View>
                            )}

                            {turn === 'enemy' && (
                                <View style={styles.waitingContainer}>
                                    <Text style={styles.waitingText}>
                                        {isMultiplayer
                                            ? waitingForOpponent
                                                ? 'Aguardando ataque do oponente...'
                                                : 'Aguardando turno do oponente...'
                                            : 'Aguardando turno do inimigo...'}
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : (
                        /* Resultado da Batalha */
                        <View
                            style={[
                                styles.resultContainer,
                                {
                                    backgroundColor:
                                        winner === 'player' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                                    borderColor:
                                        winner === 'player' ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 107, 107, 0.5)',
                                },
                            ]}
                        >
                            <Text style={styles.resultEmoji}>{winner === 'player' ? '🏆' : '💀'}</Text>

                            <Text
                                style={[
                                    styles.resultText,
                                    {
                                        color: winner === 'player' ? '#00FF88' : '#FF6B6B',
                                    },
                                ]}
                            >
                                {winner === 'player' ? 'VITÓRIA!' : 'DERROTA!'}
                            </Text>

                            <ChaosButton
                                title="Finalizar Batalha"
                                onPress={handleEndBattle}
                                variant={winner === 'player' ? 'success' : 'danger'}
                                size="large"
                            />
                        </View>
                    )}
                </View>

                {/* Botão de voltar */}
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>✕</Text>
                </Pressable>
            </Animated.View>

            {/* Move Detail Modal */}
            <MoveDetailModal
                visible={selectedMove !== null}
                move={selectedMove}
                onClose={() => setSelectedMove(null)}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    battleContainer: {
        flex: 1,
        padding: 16,
    },

    // HUD Superior
    hudContainer: {
        position: 'absolute',
        top: 50,
        width: width * 0.4,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    hudLeft: {
        left: 16,
    },
    hudRight: {
        right: 16,
    },
    hudContent: {
        alignItems: 'center',
    },
    characterName: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    hpContainer: {
        width: '100%',
        alignItems: 'center',
    },
    hpBarBg: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        height: 8,
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
    },
    hpBar: {
        height: '100%',
        borderRadius: 4,
    },
    hpText: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 4,
    },

    // Arena Central
    arena: {
        flex: 0.65,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
        marginBottom: 20,
    },
    characterContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    enemyContainer: {
        left: width * 0,
    },
    playerContainer: {
        right: width * 0,
    },
    characterSprite: {
        width: 80,
        height: 80,
    },
    turnIndicator: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        position: 'absolute',
        top: 140,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    turnText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1.5,
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    // Battle Log
    battleLogContainer: {
        position: 'absolute',
        bottom: 390,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(17, 24, 39, 0.85)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
        maxHeight: 70,
    },
    battleLogContent: {
        gap: 4,
    },
    battleLogText: {
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
    },

    // Ataques
    attacksContainer: {
        position: 'absolute',
        bottom: 150,
        left: 16,
        right: 16,
        maxHeight: 220,
    },
    attacksGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 10,
    },
    attackWrapper: {
        width: '45%',
        margin: 8,
    },
    attackButton: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
    },
    attackName: {
        color: '#FFD700',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    waitingContainer: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 107, 107, 0.3)',
    },
    waitingText: {
        color: '#FF6B6B',
        fontSize: 15,
        fontStyle: 'italic',
        fontWeight: '600',
        letterSpacing: 0.5,
    },

    // Resultado da Batalha
    resultContainer: {
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    resultEmoji: {
        fontSize: 40,
        marginBottom: 12,
    },
    resultText: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 16,
        textShadowColor: '#000',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },

    // Botão de voltar
    backButton: {
        position: 'absolute',
        top: 50,
        right: width * 0.5 - 20,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 107, 107, 0.6)',
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    backButtonText: {
        fontSize: 22,
        color: '#FF6B6B',
        fontWeight: '800',
    },

    // Novos estilos para animações
    screenFlash: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        zIndex: 1000,
        pointerEvents: 'none', // Permite toques passarem através do elemento
    },
    attackEffect: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 100,
        height: 100,
        marginTop: -50,
        marginLeft: -50,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        pointerEvents: 'none', // Permite toques passarem através do elemento
    },
    attackEffectText: {
        fontSize: 60,
        color: '#FFD700',
        textShadowColor: '#FF4444',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 10,
    },
    damageText: {
        position: 'absolute',
        top: '45%',
        left: '50%',
        marginLeft: -30,
        zIndex: 998,
        pointerEvents: 'none', // Permite toques passarem através do elemento
    },
    damageTextContent: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FF4444',
        textShadowColor: '#000000',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 5,
    },
})
