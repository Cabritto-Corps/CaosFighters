import { useFocusEffect, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import ChaoticBackground from '../components/ui/ChaoticBackground'
import { useAuth } from '../hooks/useAuth'
import { apiService } from '../services/api'
import type { BattleHistoryItem, BattleLogEntry } from '../types/battle'

export default function ProfileScreen() {
    const router = useRouter()
    const { user, isAuthenticated, refreshUserProfile } = useAuth()
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current

    const [battleHistory, setBattleHistory] = useState<BattleHistoryItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [battleDetailsModalVisible, setBattleDetailsModalVisible] = useState(false)
    const [selectedBattle, setSelectedBattle] = useState<BattleHistoryItem | null>(null)
    const [loadingBattleDetails, setLoadingBattleDetails] = useState(false)

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start()
    }, [])

    useEffect(() => {
        if (isAuthenticated && user?.id) {
            loadProfileData()
        } else {
            setIsLoading(false)
        }
    }, [isAuthenticated, user?.id])

    // Refresh profile when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (isAuthenticated && user?.id) {
                loadProfileData()
            }
        }, [isAuthenticated, user?.id])
    )

    const loadProfileData = async () => {
        try {
            setIsLoading(true)
            setError(null)

            if (!user?.id) {
                throw new Error('User ID not found')
            }

            // Refresh user profile to get latest points (don't fail if this fails)
            try {
                await refreshUserProfile()
            } catch (refreshError) {
                console.warn('Failed to refresh user profile, continuing with cached data:', refreshError)
                // Continue loading battle history even if refresh fails
                // Don't set error state for refresh failures as we can use cached data
            }

            const historyResponse = await apiService.getBattleHistory(user.id, 50)

            if (historyResponse.success && historyResponse.data) {
                setBattleHistory(historyResponse.data)
            } else {
                // If history fails, set empty array instead of error
                setBattleHistory([])
            }
        } catch (err) {
            console.error('Failed to load profile data:', err)
            setError(err instanceof Error ? err.message : 'Failed to load profile data')
        } finally {
            setIsLoading(false)
        }
    }

    const calculateStats = () => {
        const totalBattles = battleHistory.length
        const victories = battleHistory.filter((b) => b.is_winner).length
        const defeats = totalBattles - victories
        const winRate = totalBattles > 0 ? (victories / totalBattles) * 100 : 0

        return {
            totalBattles,
            victories,
            defeats,
            winRate: Math.round(winRate * 10) / 10,
        }
    }

    const getRankName = (points: number): string => {
        if (points >= 10000) return 'Lenda'
        if (points >= 5000) return 'Mestre'
        if (points >= 2500) return 'Veterano'
        if (points >= 1000) return 'Experiente'
        if (points >= 500) return 'Iniciante'
        return 'Novato'
    }

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatDuration = (duration: string | null): string => {
        if (!duration) return 'N/A'
        // Duration is in PostgreSQL interval format, parse it
        const match = duration.match(/(\d+):(\d+):(\d+)/)
        if (match) {
            const hours = parseInt(match[1])
            const minutes = parseInt(match[2])
            const seconds = parseInt(match[3])
            if (hours > 0) {
                return `${hours}h ${minutes}m ${seconds}s`
            }
            if (minutes > 0) {
                return `${minutes}m ${seconds}s`
            }
            return `${seconds}s`
        }
        return duration
    }

    const formatTime = (timestamp: string): string => {
        try {
            const date = new Date(timestamp)
            if (isNaN(date.getTime())) {
                return ''
            }
            return date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })
        } catch {
            return ''
        }
    }

    const parseBattleLog = (
        battleLog: string[] | BattleLogEntry[] | undefined,
        userId: string | undefined,
        opponentName: string
    ): BattleLogEntry[] => {
        if (!battleLog || battleLog.length === 0) {
            return []
        }

        // Se já é array de objetos estruturados, retornar como está
        if (typeof battleLog[0] === 'object' && battleLog[0] !== null) {
            return battleLog as BattleLogEntry[]
        }

        // Se é array de strings, converter para objetos estruturados
        const parsedLog: BattleLogEntry[] = []
        const logStrings = battleLog as string[]

        logStrings.forEach((logString, index) => {
            const entry: BattleLogEntry = {
                type: 'message',
                message: logString,
                timestamp: new Date(Date.now() - (logStrings.length - index) * 1000).toISOString(),
            }

            // Parse diferentes tipos de mensagens
            if (logString.includes('batalha entre') && logString.includes('começou')) {
                entry.type = 'start'
                const match = logString.match(/entre (.+?) e (.+?) começou/)
                if (match) {
                    entry.attacker_name = match[1].trim()
                    entry.target_name = match[2].trim()
                }
            } else if (logString.includes('usou') && logString.includes('causou')) {
                entry.type = 'attack'
                const moveMatch = logString.match(/(.+?) usou (.+?) e causou (\d+) de dano/)
                if (moveMatch) {
                    entry.attacker_name = moveMatch[1].trim()
                    entry.move_name = moveMatch[2].trim()
                    entry.damage = parseInt(moveMatch[3], 10)
                    entry.attacker_id =
                        moveMatch[1].trim() === 'Você' || moveMatch[1].trim() === 'você' ? userId : undefined
                }
            } else if (logString.includes('foi derrotado')) {
                entry.type = 'end'
                const defeatMatch = logString.match(/(.+?) foi derrotado por (.+?)[!.]/)
                if (defeatMatch) {
                    entry.attacker_name = defeatMatch[1].trim()
                    entry.target_name = defeatMatch[2].trim()
                }
            }

            parsedLog.push(entry)
        })

        return parsedLog
    }

    const handleBattlePress = async (battle: BattleHistoryItem) => {
        setSelectedBattle(battle)
        setBattleDetailsModalVisible(true)
        setLoadingBattleDetails(true)

        try {
            if (!user?.id) {
                throw new Error('User ID not found')
            }

            const detailsResponse = await apiService.getBattleDetails(battle.id, user.id)
            if (detailsResponse.success && detailsResponse.data) {
                setSelectedBattle(detailsResponse.data)
            }
        } catch (err) {
            console.error('Failed to load battle details:', err)
            // Keep the battle from history if details fail to load
        } finally {
            setLoadingBattleDetails(false)
        }
    }

    const stats = calculateStats()

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
                <StatusBar style="light" />
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={{ color: '#ffffff', marginTop: 16 }}>Carregando perfil...</Text>
            </View>
        )
    }

    if (!isAuthenticated || !user) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
                <StatusBar style="light" />
                <Text style={{ color: '#ffffff', fontSize: 18 }}>Por favor, faça login para ver seu perfil</Text>
            </View>
        )
    }

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
                <StatusBar style="light" />
                <Text style={{ color: '#FF6B6B', fontSize: 18, marginBottom: 16 }}>Erro ao carregar perfil</Text>
                <Text style={{ color: '#94a3b8', fontSize: 14 }}>{error}</Text>
            </View>
        )
    }

    return (
        <View style={{ flex: 1 }}>
            <StatusBar style="light" />

            <ChaoticBackground
                colors={['#1a1a2e', '#16213e', '#0f3460']}
                particleCount={30}
                particleColors={['#FFD700', '#00FF88', '#FF6B6B']}
                animated={true}
            />

            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
                <Animated.View
                    style={{
                        flex: 1,
                        paddingHorizontal: 24,
                        paddingTop: 70,
                        paddingBottom: 40,
                        transform: [{ translateY: slideAnim }],
                    }}
                >
                    {/* Header */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 40,
                        }}
                    >
                        <Pressable
                            onPress={() => router.back()}
                            style={({ pressed }) => ({
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#2D3748',
                                padding: 12,
                                borderRadius: 12,
                                borderWidth: 2,
                                borderColor: '#FFD700',
                                transform: [{ scale: pressed ? 0.95 : 1 }],
                            })}
                        >
                            <Text style={{ fontSize: 20, color: '#FFD700', marginRight: 8 }}>←</Text>
                            <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '600' }}>Voltar</Text>
                        </Pressable>

                        <Text
                            style={{
                                fontSize: 24,
                                fontWeight: '700',
                                color: '#ffffff',
                                letterSpacing: 1,
                            }}
                        >
                            👤 PERFIL
                        </Text>
                    </View>

                    {/* Avatar e Info Principal */}
                    <View
                        style={{
                            backgroundColor: '#1E293B',
                            borderRadius: 24,
                            padding: 24,
                            marginTop: 24,
                            marginBottom: 24,
                            borderWidth: 3,
                            borderColor: '#FFD700',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.5,
                            shadowRadius: 8,
                            elevation: 8,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 70,
                                marginBottom: 16,
                                textShadowColor: '#FFD700',
                                textShadowOffset: { width: 0, height: 0 },
                                textShadowRadius: 15,
                            }}
                        >
                            ⚔️
                        </Text>

                        <Text
                            style={{
                                fontSize: 22,
                                fontWeight: '700',
                                color: '#FFD700',
                                letterSpacing: 1,
                                marginBottom: 8,
                                textShadowColor: '#000',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 3,
                            }}
                        >
                            {user?.name ?? 'Usuário'}
                        </Text>

                        <Text
                            style={{
                                fontSize: 16,
                                color: '#00FF88',
                                fontWeight: '700',
                                marginBottom: 16,
                                textShadowColor: '#000',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 2,
                            }}
                        >
                            {getRankName(user?.points ?? 0)}
                        </Text>

                        {/* Pontos */}
                        <View
                            style={{
                                backgroundColor: '#2D3748',
                                padding: 16,
                                borderRadius: 16,
                                width: '100%',
                                marginBottom: 16,
                                borderWidth: 2,
                                borderColor: '#FFD700',
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600' }}>Pontos</Text>
                                <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: '800' }}>
                                    {user?.points?.toLocaleString() ?? '0'}
                                </Text>
                            </View>
                        </View>

                        {/* Stats */}
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-around',
                                width: '100%',
                            }}
                        >
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: '#00FF88', fontSize: 24, fontWeight: '800' }}>
                                    {stats.victories}
                                </Text>
                                <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '600' }}>Vitórias</Text>
                            </View>

                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: '#FF6B6B', fontSize: 24, fontWeight: '800' }}>
                                    {stats.defeats}
                                </Text>
                                <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '600' }}>Derrotas</Text>
                            </View>

                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: '#FFD700', fontSize: 24, fontWeight: '800' }}>
                                    {stats.winRate}%
                                </Text>
                                <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '600' }}>Taxa</Text>
                            </View>
                        </View>
                    </View>

                    {/* Estatísticas Detalhadas */}
                    <View
                        style={{
                            backgroundColor: '#1E293B',
                            borderRadius: 20,
                            padding: 20,
                            marginBottom: 24,
                            borderWidth: 2,
                            borderColor: '#475569',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 20,
                                fontWeight: '800',
                                color: '#FFD700',
                                marginBottom: 16,
                                letterSpacing: 1,
                                textShadowColor: '#000',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 2,
                            }}
                        >
                            📊 ESTATÍSTICAS
                        </Text>

                        <View style={{ gap: 14 }}>
                            <View
                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600' }}>
                                    Total de Batalhas
                                </Text>
                                <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '700' }}>
                                    {stats.totalBattles}
                                </Text>
                            </View>

                            <View
                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600' }}>Vitórias</Text>
                                <Text style={{ color: '#00FF88', fontSize: 16, fontWeight: '700' }}>
                                    {stats.victories}
                                </Text>
                            </View>

                            <View
                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600' }}>Derrotas</Text>
                                <Text style={{ color: '#FF6B6B', fontSize: 16, fontWeight: '700' }}>
                                    {stats.defeats}
                                </Text>
                            </View>

                            <View
                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600' }}>
                                    Taxa de Vitória
                                </Text>
                                <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '700' }}>
                                    {stats.winRate}%
                                </Text>
                            </View>

                            <View
                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600' }}>
                                    Pontuação Total
                                </Text>
                                <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '700' }}>
                                    {user?.points?.toLocaleString() ?? '0'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Histórico de Batalhas */}
                    <View
                        style={{
                            backgroundColor: '#1E293B',
                            borderRadius: 20,
                            padding: 20,
                            marginBottom: 32,
                            borderWidth: 2,
                            borderColor: '#475569',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 20,
                                fontWeight: '800',
                                color: '#FFD700',
                                marginBottom: 16,
                                letterSpacing: 1,
                                textShadowColor: '#000',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 2,
                            }}
                        >
                            ⚔️ HISTÓRICO DE BATALHAS
                        </Text>

                        {battleHistory.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '500' }}>
                                    Nenhuma batalha encontrada
                                </Text>
                            </View>
                        ) : (
                            <View style={{ gap: 12 }}>
                                {battleHistory.map((battle) => (
                                    <Pressable
                                        key={battle.id}
                                        onPress={() => handleBattlePress(battle)}
                                        style={({ pressed }) => ({
                                            backgroundColor: battle.is_winner ? '#064E3B' : '#7F1D1D',
                                            padding: 16,
                                            borderRadius: 12,
                                            borderWidth: 3,
                                            borderColor: battle.is_winner ? '#00FF88' : '#FF6B6B',
                                            transform: [{ scale: pressed ? 0.98 : 1 }],
                                        })}
                                    >
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                marginBottom: 10,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: battle.is_winner ? '#00FF88' : '#FF6B6B',
                                                    fontSize: 16,
                                                    fontWeight: '800',
                                                }}
                                            >
                                                {battle.is_winner ? '✓ Vitória' : '✗ Derrota'}
                                            </Text>
                                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                                                {formatDate(battle.battle_timestamp)}
                                            </Text>
                                        </View>

                                        <View style={{ marginBottom: 8 }}>
                                            <Text
                                                style={{
                                                    color: '#FFFFFF',
                                                    fontSize: 15,
                                                    marginBottom: 6,
                                                    fontWeight: '700',
                                                }}
                                            >
                                                Contra: {battle.opponent?.name ?? 'Desconhecido'}
                                            </Text>
                                            <Text style={{ color: '#E2E8F0', fontSize: 14, marginBottom: 2 }}>
                                                Seu personagem: {battle.user_character?.name ?? 'Desconhecido'}
                                            </Text>
                                            <Text style={{ color: '#E2E8F0', fontSize: 14 }}>
                                                Oponente: {battle.opponent_character?.name ?? 'Desconhecido'}
                                            </Text>
                                        </View>

                                        {battle.duration && (
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '600' }}>
                                                    Duração: {formatDuration(battle.duration)}
                                                </Text>
                                                {battle.is_winner && battle.points_awarded && (
                                                    <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '700' }}>
                                                        +{battle.points_awarded} pts
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                        {!battle.duration && battle.is_winner && battle.points_awarded && (
                                            <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '700' }}>
                                                +{battle.points_awarded} pts
                                            </Text>
                                        )}
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Modal de Detalhes da Batalha */}
            <Modal
                visible={battleDetailsModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setBattleDetailsModalVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 20,
                    }}
                >
                    {/* Backdrop com opacidade */}
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: '#000000',
                            opacity: 0.9,
                        }}
                    />

                    {/* Conteúdo do Modal sem opacidade */}
                    <View
                        style={{
                            backgroundColor: '#1E293B',
                            borderRadius: 24,
                            padding: 24,
                            width: '100%',
                            maxHeight: '80%',
                            borderWidth: 3,
                            borderColor: selectedBattle?.is_winner ? '#00FF88' : '#FF6B6B',
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 20,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 22,
                                    fontWeight: '800',
                                    color: selectedBattle?.is_winner ? '#00FF88' : '#FF6B6B',
                                }}
                            >
                                {selectedBattle?.is_winner ? '✓ VITÓRIA' : '✗ DERROTA'}
                            </Text>
                            <Pressable
                                onPress={() => setBattleDetailsModalVisible(false)}
                                style={{
                                    backgroundColor: '#475569',
                                    padding: 8,
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>✕</Text>
                            </Pressable>
                        </View>

                        {loadingBattleDetails ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#FFD700" />
                                <Text style={{ color: '#FFFFFF', marginTop: 16 }}>Carregando detalhes...</Text>
                            </View>
                        ) : selectedBattle ? (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={{ gap: 16 }}>
                                    {/* Informações da Batalha */}
                                    <View
                                        style={{
                                            backgroundColor: '#2D3748',
                                            padding: 16,
                                            borderRadius: 12,
                                            borderWidth: 2,
                                            borderColor: '#475569',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: '#FFD700',
                                                fontSize: 16,
                                                fontWeight: '700',
                                                marginBottom: 12,
                                            }}
                                        >
                                            INFORMAÇÕES DA BATALHA
                                        </Text>
                                        <View style={{ gap: 8 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#E2E8F0', fontSize: 14 }}>Data:</Text>
                                                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                                                    {formatDate(selectedBattle.battle_timestamp)}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#E2E8F0', fontSize: 14 }}>Oponente:</Text>
                                                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                                                    {selectedBattle.opponent?.name ?? 'Desconhecido'}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#E2E8F0', fontSize: 14 }}>Seu Personagem:</Text>
                                                <Text style={{ color: '#00FF88', fontSize: 14, fontWeight: '600' }}>
                                                    {selectedBattle.user_character?.name ?? 'Desconhecido'}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#E2E8F0', fontSize: 14 }}>
                                                    Personagem Oponente:
                                                </Text>
                                                <Text style={{ color: '#FF6B6B', fontSize: 14, fontWeight: '600' }}>
                                                    {selectedBattle.opponent_character?.name ?? 'Desconhecido'}
                                                </Text>
                                            </View>
                                            {selectedBattle.duration && (
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ color: '#E2E8F0', fontSize: 14 }}>Duração:</Text>
                                                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                                                        {formatDuration(selectedBattle.duration)}
                                                    </Text>
                                                </View>
                                            )}
                                            {selectedBattle.is_winner && selectedBattle.points_awarded && (
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ color: '#E2E8F0', fontSize: 14 }}>
                                                        Pontos Ganhos:
                                                    </Text>
                                                    <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700' }}>
                                                        +{selectedBattle.points_awarded} pts
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Log da Batalha */}
                                    {selectedBattle.battle_log && selectedBattle.battle_log.length > 0 ? (
                                        <View
                                            style={{
                                                backgroundColor: '#2D3748',
                                                padding: 16,
                                                borderRadius: 12,
                                                borderWidth: 2,
                                                borderColor: '#475569',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: '#FFD700',
                                                    fontSize: 16,
                                                    fontWeight: '700',
                                                    marginBottom: 12,
                                                }}
                                            >
                                                LOG DA BATALHA
                                            </Text>
                                            <View style={{ gap: 8 }}>
                                                {parseBattleLog(
                                                    selectedBattle.battle_log,
                                                    user?.id,
                                                    selectedBattle.opponent?.name ?? 'Oponente'
                                                ).map((logEntry, index) => {
                                                    const isUserAction =
                                                        logEntry.attacker_id === user?.id ||
                                                        logEntry.attacker_name === 'Você' ||
                                                        logEntry.attacker_name === 'você'

                                                    const getEntryColor = () => {
                                                        if (logEntry.type === 'start') return '#60A5FA'
                                                        if (logEntry.type === 'end') return '#F87171'
                                                        return isUserAction ? '#00FF88' : '#FF6B6B'
                                                    }

                                                    const getEntryBgColor = () => {
                                                        if (logEntry.type === 'start') return '#1E3A8A'
                                                        if (logEntry.type === 'end') return '#7F1D1D'
                                                        return isUserAction ? '#064E3B' : '#7F1D1D'
                                                    }

                                                    return (
                                                        <View
                                                            key={index}
                                                            style={{
                                                                backgroundColor: getEntryBgColor(),
                                                                padding: 12,
                                                                borderRadius: 8,
                                                                borderWidth: 1,
                                                                borderColor: getEntryColor(),
                                                            }}
                                                        >
                                                            {logEntry.type === 'start' && (
                                                                <>
                                                                    <Text
                                                                        style={{
                                                                            color: getEntryColor(),
                                                                            fontSize: 13,
                                                                            fontWeight: '700',
                                                                            marginBottom: 4,
                                                                        }}
                                                                    >
                                                                        🎬 BATALHA INICIADA
                                                                    </Text>
                                                                    <Text
                                                                        style={{
                                                                            color: '#FFFFFF',
                                                                            fontSize: 14,
                                                                            fontWeight: '600',
                                                                        }}
                                                                    >
                                                                        {logEntry.message}
                                                                    </Text>
                                                                </>
                                                            )}

                                                            {logEntry.type === 'attack' && (
                                                                <>
                                                                    <View
                                                                        style={{
                                                                            flexDirection: 'row',
                                                                            justifyContent: 'space-between',
                                                                            marginBottom: 4,
                                                                        }}
                                                                    >
                                                                        <Text
                                                                            style={{
                                                                                color: getEntryColor(),
                                                                                fontSize: 13,
                                                                                fontWeight: '700',
                                                                            }}
                                                                        >
                                                                            {isUserAction
                                                                                ? 'Você'
                                                                                : logEntry.attacker_name ||
                                                                                  selectedBattle.opponent?.name ||
                                                                                  'Oponente'}
                                                                        </Text>
                                                                        {logEntry.timestamp && (
                                                                            <Text
                                                                                style={{
                                                                                    color: '#E2E8F0',
                                                                                    fontSize: 12,
                                                                                }}
                                                                            >
                                                                                {formatTime(logEntry.timestamp)}
                                                                            </Text>
                                                                        )}
                                                                    </View>
                                                                    <Text
                                                                        style={{
                                                                            color: '#FFFFFF',
                                                                            fontSize: 14,
                                                                            fontWeight: '600',
                                                                        }}
                                                                    >
                                                                        {logEntry.move_name || 'Ataque'}
                                                                    </Text>
                                                                    {logEntry.damage !== undefined && (
                                                                        <Text
                                                                            style={{ color: '#E2E8F0', fontSize: 13 }}
                                                                        >
                                                                            💥 Dano: {logEntry.damage}
                                                                        </Text>
                                                                    )}
                                                                </>
                                                            )}

                                                            {logEntry.type === 'end' && (
                                                                <>
                                                                    <Text
                                                                        style={{
                                                                            color: getEntryColor(),
                                                                            fontSize: 13,
                                                                            fontWeight: '700',
                                                                            marginBottom: 4,
                                                                        }}
                                                                    >
                                                                        🏁 BATALHA FINALIZADA
                                                                    </Text>
                                                                    <Text
                                                                        style={{
                                                                            color: '#FFFFFF',
                                                                            fontSize: 14,
                                                                            fontWeight: '600',
                                                                        }}
                                                                    >
                                                                        {logEntry.message}
                                                                    </Text>
                                                                </>
                                                            )}

                                                            {logEntry.type === 'message' && (
                                                                <>
                                                                    {logEntry.timestamp && (
                                                                        <Text
                                                                            style={{
                                                                                color: '#E2E8F0',
                                                                                fontSize: 12,
                                                                                marginBottom: 4,
                                                                            }}
                                                                        >
                                                                            {formatTime(logEntry.timestamp)}
                                                                        </Text>
                                                                    )}
                                                                    <Text
                                                                        style={{
                                                                            color: '#FFFFFF',
                                                                            fontSize: 14,
                                                                            fontWeight: '500',
                                                                        }}
                                                                    >
                                                                        {logEntry.message}
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </View>
                                                    )
                                                })}
                                            </View>
                                        </View>
                                    ) : (
                                        <View
                                            style={{
                                                backgroundColor: '#2D3748',
                                                padding: 16,
                                                borderRadius: 12,
                                                borderWidth: 2,
                                                borderColor: '#475569',
                                            }}
                                        >
                                            <Text style={{ color: '#E2E8F0', fontSize: 14, textAlign: 'center' }}>
                                                Nenhum log disponível para esta batalha
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </View>
    )
}
