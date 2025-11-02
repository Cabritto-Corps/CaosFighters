import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import BattleAttackButton from '../components/ui/BattleAttackButton'
import ChaosButton from '../components/ui/ChaosButton'
import ChaoticBackground from '../components/ui/ChaoticBackground'
import MoveDetailModal, { MoveDetail } from '../components/ui/MoveDetailModal'
import { apiService } from '../services/api'

const { width, height } = Dimensions.get('window')

export default function BattleScreen() {
    const router = useRouter()
    const params = useLocalSearchParams()

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

    // Battle timing
    const battleStartTimeRef = useRef<number>(Date.now())

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
    }, [])

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
        if (turn === 'enemy' && !battleEnded) {
            // IA simples do inimigo
            const timer = setTimeout(() => {
                enemyAttack()
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [turn, battleEnded])

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

    const playerAttack = (attack: PlayerMove) => {
        if (turn !== 'player' || battleEnded) return

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
                                                delay={index * 120}
                                            />
                                        </View>
                                    ))}
                                </View>
                            )}

                            {turn === 'enemy' && (
                                <View style={styles.waitingContainer}>
                                    <Text style={styles.waitingText}>Aguardando turno do inimigo...</Text>
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
