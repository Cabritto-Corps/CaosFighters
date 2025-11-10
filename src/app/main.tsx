import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Dimensions, Image, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import ChaosButton from '../components/ui/ChaosButton'
import ChaoticBackground from '../components/ui/ChaoticBackground'
import ConfigModal from '../components/ui/ConfigModal'
import ResultModal from '../components/ui/ResultModal'
import { useAuth } from '../hooks/useAuth'
import { useCharacter } from '../hooks/useCharacter'
import { apiService } from '../services/api'
import { websocketService } from '../services/websocket'
import type { MatchFoundData } from '../types/battle'

const { width } = Dimensions.get('window')

export default function MainScreen() {
    const router = useRouter()
    const { user } = useAuth()
    const {
        currentCharacter,
        isLoading: characterLoading,
        error: characterError,
        canRegenerate,
        timeUntilRegeneration,
        regenerateCharacter,
    } = useCharacter()
    const [configModalVisible, setConfigModalVisible] = useState(false)
    const [resultModalVisible, setResultModalVisible] = useState(false)
    const [isStartingBattle, setIsStartingBattle] = useState(false)
    const [isMultiplayerEnabled, setIsMultiplayerEnabled] = useState(false)
    const [isSearchingOpponent, setIsSearchingOpponent] = useState(false)
    
    // Refs to store intervals and timeouts for cleanup
    const matchmakingPollIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const matchmakingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const websocketUnsubscribeRef = useRef<(() => void) | null>(null)
    
    const [lastBattleResult, setLastBattleResult] = useState({
        victory: true,
        score: 1250,
        enemyName: 'Pikachu',
        experience: 150,
        coinsEarned: 75,
    })

    // Função para renderizar a imagem do personagem
    const renderCharacterImage = () => {
        if (!currentCharacter) {
            return (
                <View
                    style={{
                        width: 120,
                        height: 120,
                        borderRadius: 15,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <ActivityIndicator color="#FFD700" size="small" />
                </View>
            )
        }

        return (
            <Image
                key={`${currentCharacter.character.id}-${currentCharacter.character.form_id}`}
                source={{ uri: currentCharacter.character.image_url }}
                style={{
                    width: 120,
                    height: 120,
                    resizeMode: 'contain',
                    borderRadius: 15,
                    padding: 10,
                }}
            />
        )
    }

    // Animações
    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.8)).current
    const pulseAnim = useRef(new Animated.Value(1)).current
    const searchingPulseAnim = useRef(new Animated.Value(1)).current

    useEffect(() => {
        // Música agora é gerenciada globalmente pelo _layout.tsx

        // Animação de entrada
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
        ]).start()

        // Animação pulsante
        const pulse = () => {
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ]).start(() => pulse())
        }
        pulse()

        // Character loading is now handled by useCharacter hook
    }, [])

    // Animação de pulso para o botão quando está procurando oponente
    useEffect(() => {
        if (isSearchingOpponent) {
            const pulse = () => {
                Animated.sequence([
                    Animated.timing(searchingPulseAnim, {
                        toValue: 1.08,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(searchingPulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ]).start(() => pulse())
            }
            pulse()
        } else {
            searchingPulseAnim.setValue(1)
        }
    }, [isSearchingOpponent, searchingPulseAnim])

    const cancelMatchmaking = () => {
        // Clear polling interval
        if (matchmakingPollIntervalRef.current) {
            clearInterval(matchmakingPollIntervalRef.current)
            matchmakingPollIntervalRef.current = null
        }

        // Clear timeout
        if (matchmakingTimeoutRef.current) {
            clearTimeout(matchmakingTimeoutRef.current)
            matchmakingTimeoutRef.current = null
        }

        // Unsubscribe from WebSocket messages
        if (websocketUnsubscribeRef.current) {
            websocketUnsubscribeRef.current()
            websocketUnsubscribeRef.current = null
        }

        // Leave matchmaking queue
        websocketService.leaveMatchmaking()
        apiService.leaveMatchmaking().catch(console.error)

        setIsSearchingOpponent(false)
        setIsStartingBattle(false)
    }

    const handleStartBattle = async () => {
        if (!currentCharacter) return

        // If already searching, cancel the search
        if (isSearchingOpponent) {
            cancelMatchmaking()
            return
        }

        if (isStartingBattle) return

        try {
            setIsStartingBattle(true)

            if (isMultiplayerEnabled) {
                // Multiplayer mode - join matchmaking queue
                if (!user?.id) {
                    console.error('User ID required for multiplayer')
                    return
                }

                setIsSearchingOpponent(true)

                // Connect to WebSocket if not connected
                if (!websocketService.isConnected()) {
                    await websocketService.connect(user.id)
                }

                // Set up message handler for match found
                const unsubscribe = websocketService.onMessage((message) => {
                    if (message.type === 'match_found' && message.data) {
                        cancelMatchmaking()

                        const matchData = message.data as MatchFoundData
                        navigateToMultiplayerBattle(matchData)
                    } else if (message.type === 'error') {
                        cancelMatchmaking()
                        console.error('Matchmaking error:', message.message)
                        alert(message.message || 'Erro ao procurar oponente')
                    } else if (message.type === 'matchmaking_queued') {
                        console.log('In queue:', message.message)
                    }
                })

                websocketUnsubscribeRef.current = unsubscribe

                // Join matchmaking queue via HTTP API
                // Events will come via WebSocket when match is found
                await apiService.startMultiplayerBattle(currentCharacter.character_user_id)
                
                // Start polling for matches (fallback if WebSocket events don't work)
                const pollInterval = setInterval(async () => {
                    if (!isSearchingOpponent) {
                        clearInterval(pollInterval)
                        return
                    }
                    
                    // Try to find match via API
                    try {
                        const matchResponse = await apiService.startMultiplayerBattle(currentCharacter.character_user_id)
                        if (matchResponse.success && (matchResponse as any).data?.match_found) {
                            cancelMatchmaking()
                            navigateToMultiplayerBattle((matchResponse as any).data.battle)
                        }
                    } catch (error) {
                        // Ignore polling errors
                    }
                }, 2000)

                matchmakingPollIntervalRef.current = pollInterval

                // Timeout after 60 seconds
                const timeoutId = setTimeout(() => {
                    if (isSearchingOpponent) {
                        cancelMatchmaking()
                        alert('Tempo esgotado. Não foi possível encontrar um oponente.')
                    }
                }, 60000)

                matchmakingTimeoutRef.current = timeoutId
            } else {
                // Bot mode - start battle immediately
                const response = await apiService.startBotBattle(currentCharacter.character_user_id)

                if (!response.success || !response.data) {
                    console.error('Failed to start battle:', response)
                    return
                }

                const battleData = response.data
                navigateToBotBattle(battleData)
            }
        } catch (error) {
            console.error('Error starting battle:', error)
            cancelMatchmaking()
        } finally {
            setIsStartingBattle(false)
        }
    }

    const navigateToBotBattle = (battleData: any) => {
        if (!currentCharacter) return

        // Prepare player moves for the battle screen
        const playerMoves =
            currentCharacter.moves?.map((m) => ({
                id: m.move?.id || (m as any).id,
                name: m.move?.name || (m as any).name,
                power: m.move?.info?.power,
                accuracy: m.move?.info?.accuracy,
                effect_chance: m.move?.info?.effect_chance,
                effect: m.move?.info?.effect,
                type: m.move?.info?.type,
            })) || []

        // Validate player stats - ensure they're numbers
        const playerStats = {
            hp: Number(currentCharacter.status.hp) || 100,
            strength: Number(currentCharacter.status.strength) || 100,
            defense: Number(currentCharacter.status.defense) || 100,
            agility: Number(currentCharacter.status.agility) || 100,
        }

        // Prepare enemy moves from backend response
        const enemyMoves =
            battleData.bot_character.moves?.map((m: any) => ({
                id: m.move?.id || m.id,
                name: m.move?.name || m.name,
                power: m.move?.info?.power,
            })) || []

        // Validate enemy stats - ensure they're numbers
        const enemyStats = {
            hp: Number(battleData.bot_character.status.hp) || 100,
            strength: Number(battleData.bot_character.status.strength) || 100,
            defense: Number(battleData.bot_character.status.defense) || 100,
            agility: Number(battleData.bot_character.status.agility) || 100,
        }

        router.push({
            pathname: '/battle' as any,
            params: {
                battleId: battleData.battle_id,
                battleMode: 'bot',
                // Player (current character) - use actual user_id from backend
                playerId: battleData.player_id,
                playerName: currentCharacter.character.name,
                playerIcon: currentCharacter.character.image_url,
                playerStats: JSON.stringify(playerStats),
                playerMoves: JSON.stringify(playerMoves),
                // Enemy (from backend)
                botId: '00000000-0000-0000-0000-000000000001',
                enemyName: battleData.bot_character.character.name,
                enemyIcon: battleData.bot_character.character.image_url,
                enemyStats: JSON.stringify(enemyStats),
                enemyMoves: JSON.stringify(enemyMoves),
            },
        })
    }

    const navigateToMultiplayerBattle = (matchData: MatchFoundData) => {
        if (!currentCharacter) return

        // Prepare player moves
        const playerMoves =
            currentCharacter.moves?.map((m) => ({
                id: m.move?.id || (m as any).id,
                name: m.move?.name || (m as any).name,
                power: m.move?.info?.power,
                accuracy: m.move?.info?.accuracy,
                effect_chance: m.move?.info?.effect_chance,
                effect: m.move?.info?.effect,
                type: m.move?.info?.type,
            })) || []

        // Player stats
        const playerStats = {
            hp: Number(matchData.player_character.status.hp) || 100,
            strength: Number(matchData.player_character.status.strength) || 100,
            defense: Number(matchData.player_character.status.defense) || 100,
            agility: Number(matchData.player_character.status.agility) || 100,
        }

        // Opponent moves
        const enemyMoves =
            matchData.opponent.moves?.map((m: any) => ({
                id: m.move?.id || m.id,
                name: m.move?.name || m.name,
                power: m.move?.info?.power,
            })) || []

        // Opponent stats
        const enemyStats = {
            hp: Number(matchData.opponent.status.hp) || 100,
            strength: Number(matchData.opponent.status.strength) || 100,
            defense: Number(matchData.opponent.status.defense) || 100,
            agility: Number(matchData.opponent.status.agility) || 100,
        }

        router.push({
            pathname: '/battle' as any,
            params: {
                battleId: matchData.battle_id,
                battleMode: 'multiplayer',
                // Player
                playerId: user?.id || '',
                playerName: matchData.player_character.character.name,
                playerIcon: matchData.player_character.character.image_url,
                playerStats: JSON.stringify(playerStats),
                playerMoves: JSON.stringify(playerMoves),
                // Opponent
                enemyId: matchData.opponent.id,
                enemyName: matchData.opponent.character.name,
                enemyIcon: matchData.opponent.character.image_url,
                enemyStats: JSON.stringify(enemyStats),
                enemyMoves: JSON.stringify(enemyMoves),
            },
        })
    }

    const handleSettings = () => {
        setConfigModalVisible(true)
    }

    const handleAccount = () => {
        router.push('/profile' as any)
    }

    const handleRanking = () => {
        router.push('/ranking' as any)
    }

    const handleRandomizeCharacter = () => {
        if (canRegenerate) {
            regenerateCharacter() // This will validate 12-hour limit and regenerate if allowed
        }
        // If canRegenerate is false, do nothing - the UI will show the cooldown message
    }

    const handleCharacterPress = () => {
        if (currentCharacter) {
            router.push('/character-details' as any)
        }
    }

    return (
        <View style={{ flex: 1 }}>
            <StatusBar style="light" />

            {/* Background caótico minimalista */}
            <ChaoticBackground
                colors={['#0f172a', '#1e293b', '#334155']}
                particleCount={40}
                particleColors={['#FFD700', '#FF6B6B', '#00FF88', '#0099FF']}
                animated={true}
            />

            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                <Animated.View
                    style={{
                        flex: 1,
                        paddingHorizontal: 24,
                        paddingTop: 60,
                        paddingBottom: 40,
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }}
                >
                    {/* Header reorganizado */}
                    <View
                        style={{
                            alignItems: 'center',
                            marginBottom: 50,
                        }}
                    >
                        {/* Título e Descrição Centralizados */}
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <Text
                                style={{
                                    fontSize: 24,
                                    fontWeight: '700',
                                    color: '#ffffff',
                                    letterSpacing: 0.5,
                                    textAlign: 'center',
                                }}
                            >
                                Arena de Batalha
                            </Text>
                            <Text
                                style={{
                                    color: '#94a3b8',
                                    fontSize: 14,
                                    marginTop: 4,
                                    textAlign: 'center',
                                }}
                            >
                                Prepare-se para a próxima batalha
                            </Text>
                        </View>

                        {/* Botões lado a lado */}
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 12,
                                justifyContent: 'center',
                            }}
                        >
                            <Pressable
                                onPress={handleRanking}
                                style={({ pressed }) => ({
                                    backgroundColor: '#2D3748',
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 2,
                                    borderColor: '#475569',
                                    transform: [{ scale: pressed ? 0.95 : 1 }],
                                    minWidth: 60,
                                    alignItems: 'center',
                                })}
                            >
                                <Text style={{ fontSize: 20 }}>🏆</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleAccount}
                                style={({ pressed }) => ({
                                    backgroundColor: '#2D3748',
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 2,
                                    borderColor: '#475569',
                                    transform: [{ scale: pressed ? 0.95 : 1 }],
                                    minWidth: 60,
                                    alignItems: 'center',
                                })}
                            >
                                <Text style={{ fontSize: 20 }}>👤</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleSettings}
                                style={({ pressed }) => ({
                                    backgroundColor: '#2D3748',
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 2,
                                    borderColor: '#475569',
                                    transform: [{ scale: pressed ? 0.95 : 1 }],
                                    minWidth: 60,
                                    alignItems: 'center',
                                })}
                            >
                                <Text style={{ fontSize: 20 }}>⚙️</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Personagem Central */}
                    <Animated.View
                        style={{
                            alignItems: 'center',
                            marginVertical: 40,
                            transform: [{ scale: pulseAnim }],
                        }}
                    >
                        <Pressable
                            onPress={handleCharacterPress}
                            style={({ pressed }) => ({
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: 24,
                                padding: 32,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                width: width * 0.85,
                                transform: [{ scale: pressed ? 0.98 : 1 }],
                            })}
                        >
                            <View style={{ marginBottom: 20 }}>{renderCharacterImage()}</View>

                            {currentCharacter ? (
                                <>
                                    <Text
                                        style={{
                                            fontSize: 22,
                                            fontWeight: '600',
                                            color: '#ffffff',
                                            textAlign: 'center',
                                            marginBottom: 8,
                                        }}
                                    >
                                        {currentCharacter.character.name}
                                    </Text>

                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: '#94a3b8',
                                            textAlign: 'center',
                                            marginBottom: 24,
                                            lineHeight: 20,
                                        }}
                                    >
                                        Tier: {currentCharacter.character.tier.name}
                                    </Text>

                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-around',
                                            width: '100%',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            padding: 16,
                                            borderRadius: 16,
                                        }}
                                    >
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500' }}>
                                                HP
                                            </Text>
                                            <Text
                                                style={{
                                                    color: '#00FF88',
                                                    fontSize: 18,
                                                    fontWeight: '600',
                                                    marginTop: 4,
                                                }}
                                            >
                                                {currentCharacter.status.hp || 0}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500' }}>
                                                FOR
                                            </Text>
                                            <Text
                                                style={{
                                                    color: '#f87171',
                                                    fontSize: 18,
                                                    fontWeight: '600',
                                                    marginTop: 4,
                                                }}
                                            >
                                                {currentCharacter.status.strength || 0}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500' }}>
                                                AGI
                                            </Text>
                                            <Text
                                                style={{
                                                    color: '#FFD700',
                                                    fontSize: 18,
                                                    fontWeight: '600',
                                                    marginTop: 4,
                                                }}
                                            >
                                                {currentCharacter.status.agility || 0}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500' }}>
                                                DEF
                                            </Text>
                                            <Text
                                                style={{
                                                    color: '#60a5fa',
                                                    fontSize: 18,
                                                    fontWeight: '600',
                                                    marginTop: 4,
                                                }}
                                            >
                                                {currentCharacter.status.defense || 0}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text
                                        style={{
                                            color: canRegenerate ? '#64748b' : '#f87171',
                                            fontSize: 12,
                                            marginTop: 16,
                                            fontStyle: 'italic',
                                            textAlign: 'center',
                                        }}
                                    >
                                        {canRegenerate
                                            ? 'Toque para ver detalhes do personagem'
                                            : `Próxima geração: ${timeUntilRegeneration}`}
                                    </Text>

                                    {characterError && (
                                        <Text
                                            style={{
                                                color: '#f87171',
                                                fontSize: 12,
                                                marginTop: 8,
                                                textAlign: 'center',
                                                fontWeight: '500',
                                            }}
                                        >
                                            {characterError}
                                        </Text>
                                    )}
                                </>
                            ) : characterLoading ? (
                                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                    <ActivityIndicator color="#FFD700" size="small" />
                                    <Text
                                        style={{
                                            color: '#94a3b8',
                                            fontSize: 14,
                                            marginTop: 12,
                                        }}
                                    >
                                        Carregando personagem...
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                    <Text
                                        style={{
                                            color: '#f87171',
                                            fontSize: 14,
                                            textAlign: 'center',
                                        }}
                                    >
                                        Erro ao carregar personagem
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    </Animated.View>

                    {/* Botão de Regenerar Personagem */}
                    {canRegenerate && (
                        <View style={{ marginBottom: 16, alignItems: 'center' }}>
                            <ChaosButton
                                title="GERAR NOVO PERSONAGEM"
                                onPress={handleRandomizeCharacter}
                                variant="secondary"
                                size="small"
                                disabled={characterLoading}
                            />
                        </View>
                    )}

                    {/* Toggle Multiplayer */}
                    <View
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: 16,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 215, 0, 0.2)',
                            marginBottom: 16,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        color: '#ffffff',
                                        fontSize: 16,
                                        fontWeight: '600',
                                        marginBottom: 4,
                                    }}
                                >
                                    Modo Multiplayer
                                </Text>
                                <Text
                                    style={{
                                        color: '#94a3b8',
                                        fontSize: 12,
                                    }}
                                >
                                    {isMultiplayerEnabled ? 'Batalhe contra jogadores reais' : 'Batalhe contra bot'}
                                </Text>
                            </View>
                            <Switch
                                value={isMultiplayerEnabled}
                                onValueChange={setIsMultiplayerEnabled}
                                trackColor={{
                                    false: '#374151',
                                    true: 'rgba(255, 215, 0, 0.3)',
                                }}
                                thumbColor={isMultiplayerEnabled ? '#FFD700' : '#9ca3af'}
                                ios_backgroundColor="#374151"
                                disabled={isStartingBattle}
                            />
                        </View>
                    </View>

                    {/* Botão Principal - Iniciar Batalha */}
                    <View style={{ marginVertical: 32 }}>
                        {isSearchingOpponent ? (
                            <Animated.View
                                style={{
                                    transform: [{ scale: searchingPulseAnim }],
                                }}
                            >
                                <ChaosButton
                                    title="CANCELAR BUSCA"
                                    onPress={handleStartBattle}
                                    variant="danger"
                                    size="large"
                                    style={{
                                        backgroundColor: '#dc2626',
                                        borderColor: '#ef4444',
                                        borderWidth: 3,
                                        shadowColor: '#ef4444',
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.8,
                                        shadowRadius: 10,
                                        elevation: 8,
                                    }}
                                    textStyle={{
                                        color: '#ffffff',
                                        fontWeight: '800',
                                    }}
                                />
                            </Animated.View>
                        ) : (
                            <ChaosButton
                                title={
                                    isMultiplayerEnabled
                                        ? 'PROCURAR OPONENTE'
                                        : isStartingBattle
                                          ? 'CARREGANDO...'
                                          : 'INICIAR BATALHA'
                                }
                                onPress={handleStartBattle}
                                variant="primary"
                                size="large"
                                disabled={!currentCharacter || characterLoading || (isStartingBattle && !isSearchingOpponent)}
                            />
                        )}
                    </View>

                    {/* Botão de Sair */}
                    <View style={{ marginTop: 24 }}>
                        <ChaosButton
                            title="← Sair da Arena"
                            onPress={() => router.replace('/')}
                            variant="secondary"
                            size="medium"
                        />
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Modais */}
            <ConfigModal visible={configModalVisible} onClose={() => setConfigModalVisible(false)} />

            <ResultModal
                visible={resultModalVisible}
                onClose={() => setResultModalVisible(false)}
                victory={lastBattleResult.victory}
                score={lastBattleResult.score}
                enemyName={lastBattleResult.enemyName}
                experience={lastBattleResult.experience}
                coinsEarned={lastBattleResult.coinsEarned}
            />
        </View>
    )
}
