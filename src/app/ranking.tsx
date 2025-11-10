import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Dimensions, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import ChaoticBackground from '../components/ui/ChaoticBackground'
import { useAuth } from '../hooks/useAuth'
import { apiService } from '../services/api'
import type { RankingUser } from '../types/ranking'
import type { BattleHistoryItem } from '../types/battle'

const { width } = Dimensions.get('window')

interface UserStats {
    name: string
    points: number
    rank: number
    totalBattles: number
    victories: number
    defeats: number
    winRate: number
}

export default function RankingScreen() {
    const router = useRouter()
    const { user } = useAuth()
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current

    const [ranking, setRanking] = useState<RankingUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Modal states
    const [userStatsModalVisible, setUserStatsModalVisible] = useState(false)
    const [selectedUserStats, setSelectedUserStats] = useState<UserStats | null>(null)
    const [loadingUserStats, setLoadingUserStats] = useState(false)

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
        loadRanking()
    }, [])

    const loadRanking = async () => {
        try {
            setIsLoading(true)
            setError(null)

            const response = await apiService.getRanking(100)
            
            if (response.success && response.data) {
                setRanking(response.data)
            } else {
                throw new Error(response.message || 'Failed to load ranking')
            }
        } catch (err) {
            console.error('Failed to load ranking:', err)
            setError(err instanceof Error ? err.message : 'Failed to load ranking')
        } finally {
            setIsLoading(false)
        }
    }

    const getPositionIcon = (position: number): string => {
        if (position === 1) return '🥇'
        if (position === 2) return '🥈'
        if (position === 3) return '🥉'
        return `#${position}`
    }

    const getPositionColor = (position: number): string => {
        if (position === 1) return '#FFD700'
        if (position === 2) return '#C0C0C0'
        if (position === 3) return '#CD7F32'
        return '#94a3b8'
    }

    const isCurrentUser = (userId: string): boolean => {
        return user?.id === userId
    }

    const handleUserPress = async (userRank: RankingUser) => {
        setUserStatsModalVisible(true)
        setLoadingUserStats(true)
        setSelectedUserStats(null)

        try {
            // Get user battle history to calculate stats
            const historyResponse = await apiService.getBattleHistory(userRank.id, 100)

            if (historyResponse.success && historyResponse.data) {
                const battles = historyResponse.data
                const totalBattles = battles.length
                const victories = battles.filter((b: BattleHistoryItem) => b.is_winner).length
                const defeats = totalBattles - victories
                const winRate = totalBattles > 0 ? (victories / totalBattles) * 100 : 0

                setSelectedUserStats({
                    name: userRank.name,
                    points: userRank.points,
                    rank: userRank.rank,
                    totalBattles,
                    victories,
                    defeats,
                    winRate: Math.round(winRate * 10) / 10,
                })
            } else {
                // If we can't get battle history, show basic info
                setSelectedUserStats({
                    name: userRank.name,
                    points: userRank.points,
                    rank: userRank.rank,
                    totalBattles: 0,
                    victories: 0,
                    defeats: 0,
                    winRate: 0,
                })
            }
        } catch (err) {
            console.error('Failed to load user stats:', err)
            // Show basic info even if full stats fail
            setSelectedUserStats({
                name: userRank.name,
                points: userRank.points,
                rank: userRank.rank,
                totalBattles: 0,
                victories: 0,
                defeats: 0,
                winRate: 0,
            })
        } finally {
            setLoadingUserStats(false)
        }
    }

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
                <StatusBar style="light" />
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={{ color: '#ffffff', marginTop: 16 }}>Carregando ranking...</Text>
            </View>
        )
    }

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
                <StatusBar style="light" />
                <Text style={{ color: '#FF6B6B', fontSize: 18, marginBottom: 16 }}>Erro ao carregar ranking</Text>
                <Text style={{ color: '#94a3b8', fontSize: 14 }}>{error}</Text>
                <Pressable
                    onPress={loadRanking}
                    style={{
                        marginTop: 20,
                        backgroundColor: '#FFD700',
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 12,
                    }}
                >
                    <Text style={{ color: '#1a1a2e', fontWeight: '600' }}>Tentar novamente</Text>
                </Pressable>
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

            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                <Animated.View
                    style={{
                        flex: 1,
                        paddingHorizontal: 24,
                        paddingTop: 60,
                        paddingBottom: 40,
                        opacity: fadeAnim,
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
                            🏆 RANKING
                        </Text>
                    </View>

                    {/* Top 3 Podium */}
                    {ranking.length >= 3 && (
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'flex-end',
                                marginBottom: 32,
                                gap: 12,
                            }}
                        >
                            {/* 2nd Place */}
                            <Pressable
                                onPress={() => handleUserPress(ranking[1])}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    alignItems: 'center',
                                    backgroundColor: '#2D3748',
                                    borderRadius: 16,
                                    padding: 16,
                                    borderWidth: 2,
                                    borderColor: '#C0C0C0',
                                    transform: [{ scale: pressed ? 0.95 : 1 }],
                                })}
                            >
                                <Text style={{ fontSize: 40, marginBottom: 8 }}>🥈</Text>
                                <Text
                                    style={{
                                        color: '#C0C0C0',
                                        fontSize: 14,
                                        fontWeight: '700',
                                        marginBottom: 4,
                                    }}
                                    numberOfLines={1}
                                >
                                    {ranking[1].name}
                                </Text>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                    {ranking[1].points.toLocaleString()} pts
                                </Text>
                            </Pressable>

                            {/* 1st Place */}
                            <Pressable
                                onPress={() => handleUserPress(ranking[0])}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    alignItems: 'center',
                                    backgroundColor: '#2D3748',
                                    borderRadius: 16,
                                    padding: 20,
                                    borderWidth: 2,
                                    borderColor: '#FFD700',
                                    marginBottom: -20,
                                    transform: [{ scale: pressed ? 0.95 : 1 }],
                                })}
                            >
                                <Text style={{ fontSize: 50, marginBottom: 8 }}>🥇</Text>
                                <Text
                                    style={{
                                        color: '#FFD700',
                                        fontSize: 16,
                                        fontWeight: '700',
                                        marginBottom: 4,
                                    }}
                                    numberOfLines={1}
                                >
                                    {ranking[0].name}
                                </Text>
                                <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                                    {ranking[0].points.toLocaleString()} pts
                                </Text>
                            </Pressable>

                            {/* 3rd Place */}
                            <Pressable
                                onPress={() => handleUserPress(ranking[2])}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    alignItems: 'center',
                                    backgroundColor: '#2D3748',
                                    borderRadius: 16,
                                    padding: 16,
                                    borderWidth: 2,
                                    borderColor: '#CD7F32',
                                    transform: [{ scale: pressed ? 0.95 : 1 }],
                                })}
                            >
                                <Text style={{ fontSize: 40, marginBottom: 8 }}>🥉</Text>
                                <Text
                                    style={{
                                        color: '#CD7F32',
                                        fontSize: 14,
                                        fontWeight: '700',
                                        marginBottom: 4,
                                    }}
                                    numberOfLines={1}
                                >
                                    {ranking[2].name}
                                </Text>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                    {ranking[2].points.toLocaleString()} pts
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Ranking List */}
                    <View
                        style={{
                            backgroundColor: '#1E293B',
                            borderRadius: 20,
                            padding: 20,
                            borderWidth: 2,
                            borderColor: '#475569',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: '700',
                                color: '#FFD700',
                                marginBottom: 16,
                                letterSpacing: 1,
                            }}
                        >
                            📊 CLASSIFICAÇÃO GERAL
                        </Text>

                        {ranking.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                                    Nenhum jogador encontrado
                                </Text>
                            </View>
                        ) : (
                            <View style={{ gap: 8 }}>
                                {ranking.map((userRank, index) => {
                                    const isCurrent = isCurrentUser(userRank.id)
                                    // Skip top 3 in list if podium is shown
                                    if (ranking.length >= 3 && index < 3) {
                                        return null
                                    }

                                    return (
                                        <Pressable
                                            key={userRank.id}
                                            onPress={() => handleUserPress(userRank)}
                                            style={({ pressed }) => ({
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: isCurrent
                                                    ? '#2D3748'
                                                    : '#1E293B',
                                                padding: 16,
                                                borderRadius: 12,
                                                borderWidth: isCurrent ? 2 : 1,
                                                borderColor: isCurrent
                                                    ? '#FFD700'
                                                    : '#475569',
                                                transform: [{ scale: pressed ? 0.98 : 1 }],
                                            })}
                                        >
                                            {/* Position */}
                                            <View
                                                style={{
                                                    width: 50,
                                                    alignItems: 'center',
                                                    marginRight: 12,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: getPositionColor(userRank.rank),
                                                        fontSize: 18,
                                                        fontWeight: '700',
                                                    }}
                                                >
                                                    {getPositionIcon(userRank.rank)}
                                                </Text>
                                            </View>

                                            {/* User Info */}
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={{
                                                        color: isCurrent ? '#FFD700' : '#ffffff',
                                                        fontSize: 16,
                                                        fontWeight: '600',
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    {userRank.name}
                                                    {isCurrent && ' (Você)'}
                                                </Text>
                                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                                    {userRank.points.toLocaleString()} pontos
                                                </Text>
                                            </View>

                                            {/* Points Badge */}
                                            <View
                                                style={{
                                                    backgroundColor: isCurrent
                                                        ? '#FFD700'
                                                        : '#475569',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 8,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: isCurrent ? '#1a1a2e' : '#E2E8F0',
                                                        fontSize: 14,
                                                        fontWeight: '700',
                                                    }}
                                                >
                                                    {userRank.points.toLocaleString()}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    )
                                })}
                            </View>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Modal de Estatísticas do Usuário */}
            <Modal
                visible={userStatsModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setUserStatsModalVisible(false)}
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
                    <Pressable
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: '#000000',
                            opacity: 0.85,
                        }}
                        onPress={() => setUserStatsModalVisible(false)}
                    />

                    {/* Conteúdo do Modal */}
                    <View
                        style={{
                            backgroundColor: '#1E293B',
                            borderRadius: 24,
                            padding: 24,
                            width: '90%',
                            maxWidth: 400,
                            borderWidth: 3,
                            borderColor: '#FFD700',
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
                                    fontSize: 20,
                                    fontWeight: '800',
                                    color: '#FFD700',
                                }}
                            >
                                📊 ESTATÍSTICAS
                            </Text>
                            <Pressable
                                onPress={() => setUserStatsModalVisible(false)}
                                style={{
                                    backgroundColor: '#475569',
                                    padding: 8,
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>✕</Text>
                            </Pressable>
                        </View>

                        {loadingUserStats ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#FFD700" />
                                <Text style={{ color: '#FFFFFF', marginTop: 16 }}>
                                    Carregando estatísticas...
                                </Text>
                            </View>
                        ) : selectedUserStats ? (
                            <View style={{ gap: 16 }}>
                                {/* Nome e Posição */}
                                <View
                                    style={{
                                        backgroundColor: '#2D3748',
                                        padding: 16,
                                        borderRadius: 12,
                                        borderWidth: 2,
                                        borderColor: '#FFD700',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 22,
                                            fontWeight: '700',
                                            color: '#FFD700',
                                            marginBottom: 8,
                                        }}
                                    >
                                        {selectedUserStats.name}
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            color: '#E2E8F0',
                                            fontWeight: '600',
                                        }}
                                    >
                                        {getPositionIcon(selectedUserStats.rank)} Posição:{' '}
                                        {selectedUserStats.rank}°
                                    </Text>
                                </View>

                                {/* Pontos */}
                                <View
                                    style={{
                                        backgroundColor: '#2D3748',
                                        padding: 16,
                                        borderRadius: 12,
                                        borderWidth: 2,
                                        borderColor: '#475569',
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600' }}>
                                            Pontuação Total
                                        </Text>
                                        <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '800' }}>
                                            {selectedUserStats.points.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>

                                {/* Estatísticas de Batalha */}
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
                                        ⚔️ HISTÓRICO DE BATALHAS
                                    </Text>
                                    <View style={{ gap: 10 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#E2E8F0', fontSize: 14 }}>Total de Batalhas</Text>
                                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                                                {selectedUserStats.totalBattles}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#E2E8F0', fontSize: 14 }}>Vitórias</Text>
                                            <Text style={{ color: '#00FF88', fontSize: 14, fontWeight: '600' }}>
                                                {selectedUserStats.victories}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#E2E8F0', fontSize: 14 }}>Derrotas</Text>
                                            <Text style={{ color: '#FF6B6B', fontSize: 14, fontWeight: '600' }}>
                                                {selectedUserStats.defeats}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#E2E8F0', fontSize: 14 }}>Taxa de Vitória</Text>
                                            <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '600' }}>
                                                {selectedUserStats.winRate}%
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </View>
    )
}

