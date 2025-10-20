import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Dimensions, Image, Pressable, ScrollView, Text, View } from 'react-native'
import ChaosButton from '../components/ui/ChaosButton'
import ChaoticBackground from '../components/ui/ChaoticBackground'
import ConfigModal from '../components/ui/ConfigModal'
import ResultModal from '../components/ui/ResultModal'
import { useCharacter } from '../hooks/useCharacter'

const { width } = Dimensions.get('window')

export default function MainScreen() {
    const router = useRouter()
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

    const handleStartBattle = () => {
        if (!currentCharacter) return

        router.push({
            pathname: '/battle' as any,
            params: {
                enemyName: currentCharacter.character.name,
                enemyPower: currentCharacter.character.status.attack?.toString() || '500',
                enemyLevel: currentCharacter.character.tier.id?.toString() || '1',
                enemyIcon: currentCharacter.character.image_url,
                enemyCharacter: 'random', // You might want to pass actual character ID
                playerCharacter: 'random', // Default for now
            },
        })
    }

    const handleSettings = () => {
        setConfigModalVisible(true)
    }

    const handleAccount = () => {
        router.push('/profile' as any)
    }

    const handleRandomizeCharacter = () => {
        if (canRegenerate) {
            regenerateCharacter() // This will validate 12-hour limit and regenerate if allowed
        }
        // If canRegenerate is false, do nothing - the UI will show the cooldown message
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
                    {/* Header minimalista */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 50,
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    fontSize: 24,
                                    fontWeight: '700',
                                    color: '#ffffff',
                                    letterSpacing: 0.5,
                                }}
                            >
                                Arena de Batalha
                            </Text>
                            <Text
                                style={{
                                    color: '#94a3b8',
                                    fontSize: 14,
                                    marginTop: 2,
                                }}
                            >
                                Prepare-se para a próxima batalha
                            </Text>
                        </View>

                        {/* Ícones do header */}
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <Pressable
                                onPress={handleSettings}
                                style={({ pressed }) => ({
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    padding: 10,
                                    borderRadius: 12,
                                    transform: [{ scale: pressed ? 0.9 : 1 }],
                                })}
                            >
                                <Text style={{ fontSize: 20 }}>⚙️</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleAccount}
                                style={({ pressed }) => ({
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    padding: 10,
                                    borderRadius: 12,
                                    transform: [{ scale: pressed ? 0.9 : 1 }],
                                })}
                            >
                                <Text style={{ fontSize: 20 }}>👤</Text>
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
                            onPress={handleRandomizeCharacter}
                            disabled={!canRegenerate}
                            style={({ pressed }) => ({
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: 24,
                                padding: 32,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: canRegenerate ? 'rgba(255, 255, 255, 0.1)' : 'rgba(248, 113, 113, 0.3)',
                                width: width * 0.85,
                                opacity: canRegenerate ? 1 : 0.7,
                                transform: [{ scale: pressed && canRegenerate ? 0.98 : 1 }],
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
                                                {currentCharacter.character.status.hp || 0}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500' }}>
                                                Ataque
                                            </Text>
                                            <Text
                                                style={{
                                                    color: '#f87171',
                                                    fontSize: 18,
                                                    fontWeight: '600',
                                                    marginTop: 4,
                                                }}
                                            >
                                                {currentCharacter.character.status.attack || 0}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500' }}>
                                                Defesa
                                            </Text>
                                            <Text
                                                style={{
                                                    color: '#60a5fa',
                                                    fontSize: 18,
                                                    fontWeight: '600',
                                                    marginTop: 4,
                                                }}
                                            >
                                                {currentCharacter.character.status.defense || 0}
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
                                            ? 'Toque para gerar novo personagem'
                                            : `Próxima geração de personagem em: ${timeUntilRegeneration}`}
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

                    {/* Botão Principal - Iniciar Batalha */}
                    <View style={{ marginVertical: 32 }}>
                        <ChaosButton
                            title={characterLoading ? 'CARREGANDO...' : 'INICIAR BATALHA'}
                            onPress={handleStartBattle}
                            variant="primary"
                            size="large"
                            disabled={!currentCharacter || characterLoading}
                        />
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
