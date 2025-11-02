import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, Text, View } from 'react-native'
import ChaoticBackground from '../components/ui/ChaoticBackground'
import MoveCard from '../components/ui/MoveCard'
import MoveDetailModal, { MoveDetail } from '../components/ui/MoveDetailModal'
import { useCharacter } from '../hooks/useCharacter'

export default function CharacterDetailsScreen() {
    const router = useRouter()
    const { currentCharacter } = useCharacter()
    const [fadeAnim] = useState(new Animated.Value(0))
    const [selectedMove, setSelectedMove] = useState<MoveDetail | null>(null)

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start()
    }, [fadeAnim])

    const getTimeRemaining = (expiresAt: string): string => {
        const now = new Date()
        const expires = new Date(expiresAt)
        const diff = expires.getTime() - now.getTime()

        if (diff <= 0) return 'Agora'

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        if (hours > 0) {
            return `${hours}h ${minutes}m restantes`
        } else {
            return `${minutes}m restantes`
        }
    }

    const getAttributeColor = (attribute: string): string => {
        switch (attribute) {
            case 'hp':
                return '#00FF88'
            case 'agility':
                return '#FFD700'
            case 'defense':
                return '#60a5fa'
            case 'strength':
                return '#f87171'
            default:
                return '#94a3b8'
        }
    }

    const getAttributeLabel = (attribute: string): string => {
        switch (attribute) {
            case 'hp':
                return 'HP'
            case 'agility':
                return 'AGI'
            case 'defense':
                return 'DEF'
            case 'strength':
                return 'FOR'
            default:
                return attribute.toUpperCase()
        }
    }

    const renderAttributeCard = (attribute: string, value: number) => (
        <View
            key={attribute}
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                flex: 1,
                margin: 4,
            }}
        >
            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500', marginBottom: 8 }}>
                {getAttributeLabel(attribute)}
            </Text>
            <Text style={{ color: getAttributeColor(attribute), fontSize: 20, fontWeight: '600' }}>{value || 0}</Text>
        </View>
    )

    if (!currentCharacter) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#FFD700" size="large" />
                <Text style={{ color: '#94a3b8', marginTop: 16 }}>Carregando personagem...</Text>
            </View>
        )
    }

    const { character, assignment, moves, status } = currentCharacter

    return (
        <View style={{ flex: 1 }}>
            <StatusBar style="light" />

            <ChaoticBackground
                colors={['#0f172a', '#1e293b', '#334155']}
                particleCount={30}
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
                    }}
                >
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
                        <Pressable
                            onPress={() => router.back()}
                            style={({ pressed }) => ({
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                padding: 12,
                                borderRadius: 12,
                                marginRight: 16,
                                transform: [{ scale: pressed ? 0.9 : 1 }],
                            })}
                        >
                            <Text style={{ fontSize: 18, color: '#ffffff' }}>←</Text>
                        </Pressable>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#ffffff' }}>Detalhes</Text>
                    </View>

                    {/* Character Image and Basic Info */}
                    <View
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 24,
                            padding: 32,
                            alignItems: 'center',
                            marginBottom: 24,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <Image
                            source={{ uri: character.image_url }}
                            style={{
                                width: 150,
                                height: 150,
                                resizeMode: 'contain',
                                borderRadius: 15,
                                marginBottom: 20,
                            }}
                        />

                        <Text style={{ fontSize: 28, fontWeight: '700', color: '#ffffff', marginBottom: 8 }}>
                            {character.name}
                        </Text>

                        <Text style={{ fontSize: 16, color: '#94a3b8', marginBottom: 16 }}>
                            Tier: {character.tier.name}
                        </Text>
                    </View>

                    {/* Attributes */}
                    <View style={{ marginBottom: 32 }}>
                        <Text style={{ fontSize: 20, fontWeight: '600', color: '#ffffff', marginBottom: 16 }}>
                            Atributos
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {renderAttributeCard('hp', status.hp)}
                            {renderAttributeCard('agility', status.agility)}
                            {renderAttributeCard('defense', status.defense)}
                            {renderAttributeCard('strength', status.strength)}
                        </View>
                    </View>

                    {/* Time Remaining */}
                    <View style={{ marginBottom: 32 }}>
                        <Text style={{ fontSize: 20, fontWeight: '600', color: '#ffffff', marginBottom: 16 }}>
                            Tempo Restante
                        </Text>
                        <View
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: 12,
                                padding: 20,
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '600' }}>
                                {getTimeRemaining(assignment.expires_at)}
                            </Text>
                            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                                Próxima geração de personagem
                            </Text>
                        </View>
                    </View>

                    {/* Moves */}
                    <View style={{ marginBottom: 32 }}>
                        <Text style={{ fontSize: 20, fontWeight: '600', color: '#ffffff', marginBottom: 16 }}>
                            Movimentos ({moves.length})
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                            Clique em um movimento para ver detalhes
                        </Text>
                        <View>
                            {moves.map((move) => (
                                <Pressable
                                    key={move.move.id}
                                    onPress={() =>
                                        setSelectedMove({
                                            id: move.move.id,
                                            name: move.move.name,
                                            power: move.move.info.power,
                                            accuracy: move.move.info.accuracy,
                                            effect_chance: move.move.info.effect_chance,
                                            effect: move.move.info.effect,
                                            type: move.move.info.type,
                                        })
                                    }
                                >
                                    <MoveCard move={move} />
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Move Detail Modal */}
                    <MoveDetailModal
                        visible={selectedMove !== null}
                        move={selectedMove}
                        onClose={() => setSelectedMove(null)}
                    />
                </Animated.View>
            </ScrollView>
        </View>
    )
}
