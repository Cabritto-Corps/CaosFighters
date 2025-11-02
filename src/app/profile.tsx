import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef } from 'react'
import { Animated, Dimensions, Pressable, ScrollView, Text, View } from 'react-native'
import ChaoticBackground from '../components/ui/ChaoticBackground'

const { width } = Dimensions.get('window')

// Dados mocados do jogador
const PLAYER_DATA = {
    name: 'Guerreiro Supremo',
    level: 25,
    experience: 3750,
    experienceToNext: 1000,
    totalBattles: 47,
    victories: 38,
    defeats: 9,
    winRate: 80.9,
    totalScore: 45820,
    coins: 1240,
    rank: 'Mestre da Arena',
    avatar: '⚔️',
    achievements: [
        { id: 1, name: 'Primeiro Sangue', description: 'Ganhe sua primeira batalha', icon: '🩸', unlocked: true },
        { id: 2, name: 'Invencível', description: 'Ganhe 10 batalhas seguidas', icon: '👑', unlocked: true },
        { id: 3, name: 'Destruidor', description: 'Cause mais de 2000 de dano', icon: '💥', unlocked: true },
        { id: 4, name: 'Lenda', description: 'Alcance nível 50', icon: '🏆', unlocked: false },
        { id: 5, name: 'Rico', description: 'Acumule 10.000 moedas', icon: '💰', unlocked: false },
        { id: 6, name: 'Imortal', description: 'Ganhe 100 batalhas', icon: '⭐', unlocked: false },
    ],
}

export default function ProfileScreen() {
    const router = useRouter()
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current

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

    const getExperienceProgress = () => {
        return (PLAYER_DATA.experience % 1000) / PLAYER_DATA.experienceToNext
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
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                padding: 12,
                                borderRadius: 12,
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
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            borderRadius: 24,
                            padding: 24,
                            marginBottom: 24,
                            borderWidth: 2,
                            borderColor: 'rgba(255, 215, 0, 0.3)',
                            alignItems: 'center',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 60,
                                marginBottom: 16,
                                textShadowColor: '#FFD700',
                                textShadowRadius: 20,
                            }}
                        >
                            {PLAYER_DATA.avatar}
                        </Text>

                        <Text
                            style={{
                                fontSize: 20,
                                fontWeight: '700',
                                color: '#FFD700',
                                letterSpacing: 1,
                                marginBottom: 8,
                            }}
                        >
                            {PLAYER_DATA.name}
                        </Text>

                        <Text
                            style={{
                                fontSize: 14,
                                color: '#00FF88',
                                fontWeight: '600',
                                marginBottom: 16,
                            }}
                        >
                            {PLAYER_DATA.rank}
                        </Text>

                        {/* Nível e Experiência */}
                        <View
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                padding: 16,
                                borderRadius: 16,
                                width: '100%',
                                marginBottom: 16,
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    marginBottom: 8,
                                }}
                            >
                                <Text style={{ color: '#94a3b8', fontSize: 14 }}>Nível {PLAYER_DATA.level}</Text>
                                <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                                    {PLAYER_DATA.experience % 1000}/{PLAYER_DATA.experienceToNext} EXP
                                </Text>
                            </View>

                            <View
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    height: 8,
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                }}
                            >
                                <View
                                    style={{
                                        backgroundColor: '#00FF88',
                                        height: '100%',
                                        width: `${getExperienceProgress() * 100}%`,
                                        borderRadius: 4,
                                    }}
                                />
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
                                <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: '700' }}>
                                    {PLAYER_DATA.coins}
                                </Text>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Moedas</Text>
                            </View>

                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: '#00FF88', fontSize: 20, fontWeight: '700' }}>
                                    {PLAYER_DATA.victories}
                                </Text>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Vitórias</Text>
                            </View>

                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: '#FF6B6B', fontSize: 20, fontWeight: '700' }}>
                                    {PLAYER_DATA.winRate}%
                                </Text>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Taxa</Text>
                            </View>
                        </View>
                    </View>

                    {/* Estatísticas Detalhadas */}
                    <View
                        style={{
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            borderRadius: 20,
                            padding: 20,
                            marginBottom: 24,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
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
                            📊 ESTATÍSTICAS
                        </Text>

                        <View style={{ gap: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#ffffff', fontSize: 14 }}>Total de Batalhas</Text>
                                <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '600' }}>
                                    {PLAYER_DATA.totalBattles}
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#ffffff', fontSize: 14 }}>Derrotas</Text>
                                <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '600' }}>
                                    {PLAYER_DATA.defeats}
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#ffffff', fontSize: 14 }}>Pontuação Total</Text>
                                <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '600' }}>
                                    {PLAYER_DATA.totalScore.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Conquistas */}
                    <View
                        style={{
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            borderRadius: 20,
                            padding: 20,
                            marginBottom: 32,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
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
                            🏆 CONQUISTAS
                        </Text>

                        <View style={{ gap: 12 }}>
                            {PLAYER_DATA.achievements.map((achievement) => (
                                <View
                                    key={achievement.id}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: achievement.unlocked
                                            ? 'rgba(0, 255, 136, 0.1)'
                                            : 'rgba(255, 255, 255, 0.05)',
                                        padding: 12,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: achievement.unlocked
                                            ? 'rgba(0, 255, 136, 0.3)'
                                            : 'rgba(255, 255, 255, 0.1)',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 20,
                                            marginRight: 12,
                                            opacity: achievement.unlocked ? 1 : 0.5,
                                        }}
                                    >
                                        {achievement.icon}
                                    </Text>

                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={{
                                                color: achievement.unlocked ? '#00FF88' : '#64748b',
                                                fontSize: 14,
                                                fontWeight: '600',
                                                marginBottom: 2,
                                            }}
                                        >
                                            {achievement.name}
                                        </Text>
                                        <Text
                                            style={{
                                                color: '#94a3b8',
                                                fontSize: 12,
                                            }}
                                        >
                                            {achievement.description}
                                        </Text>
                                    </View>

                                    {achievement.unlocked && (
                                        <Text
                                            style={{
                                                color: '#00FF88',
                                                fontSize: 16,
                                            }}
                                        >
                                            ✓
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    )
}
