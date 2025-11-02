import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { CharacterMove } from '../../types/character'

interface MoveCardProps {
    move: CharacterMove
    isSelected?: boolean
    onPress?: () => void
}

export default function MoveCard({ move, isSelected = false, onPress }: MoveCardProps) {
    const getTypeColor = (type: string): string => {
        const colors: Record<string, string> = {
            normal: '#A8A878',
            fire: '#F08030',
            water: '#6890F0',
            grass: '#78C850',
            electric: '#F8D030',
            ice: '#98D8D8',
            fighting: '#C03028',
            poison: '#A040A0',
            ground: '#E0C068',
            flying: '#A890F0',
            psychic: '#F85888',
            bug: '#A8B820',
            rock: '#B8A038',
            ghost: '#705898',
            dragon: '#7038F8',
            dark: '#705848',
            steel: '#B8B8D0',
            fairy: '#EE99AC',
        }
        return colors[type.toLowerCase()] || '#A8A878'
    }

    const moveInfo = move.move.info

    return (
        <View
            style={[
                styles.container,
                isSelected && styles.containerSelected,
            ]}
            onTouchEnd={onPress}
        >
            {/* Type Badge */}
            <View
                style={[
                    styles.typeBadge,
                    { backgroundColor: getTypeColor(moveInfo.type) },
                ]}
            >
                <Text style={styles.typeText}>{moveInfo.type.toUpperCase()}</Text>
            </View>

            {/* Move Name */}
            <Text style={styles.moveName}>{move.move.name}</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                {moveInfo.power && (
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>POW</Text>
                        <Text style={styles.statValue}>{moveInfo.power}</Text>
                    </View>
                )}

                {moveInfo.accuracy && (
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>ACC</Text>
                        <Text style={styles.statValue}>{moveInfo.accuracy}%</Text>
                    </View>
                )}

                {moveInfo.effect_chance && (
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>CHANCE</Text>
                        <Text style={styles.statValue}>{moveInfo.effect_chance}%</Text>
                    </View>
                )}
            </View>

            {/* Effect Description */}
            {moveInfo.effect && (
                <Text style={styles.effectText} numberOfLines={2}>
                    {moveInfo.effect}
                </Text>
            )}

            {/* Slot Number */}
            <Text style={styles.slotNumber}>Slot {move.slot}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        overflow: 'hidden',
    },
    containerSelected: {
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
    },
    typeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginBottom: 8,
    },
    typeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    moveName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: 'row',
        marginBottom: 8,
        gap: 8,
    },
    stat: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        padding: 6,
        alignItems: 'center',
    },
    statLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10,
        fontWeight: '600',
    },
    statValue: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 2,
    },
    effectText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
        lineHeight: 14,
        marginBottom: 6,
        fontStyle: 'italic',
    },
    slotNumber: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        alignSelf: 'flex-end',
    },
})
