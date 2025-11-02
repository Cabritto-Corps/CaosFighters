import React, { useState } from 'react'
import { ScrollView, StyleSheet, View, Text, Pressable } from 'react-native'
import MoveCard from './MoveCard'
import type { CharacterMove } from '../../types/character'

interface MovesListProps {
    moves: CharacterMove[]
    onMoveSelect?: (move: CharacterMove) => void
    selectable?: boolean
}

export default function MovesList({ moves, onMoveSelect, selectable = false }: MovesListProps) {
    const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null)

    const handleMovePress = (move: CharacterMove) => {
        if (selectable) {
            setSelectedMoveId(move.move.id)
            onMoveSelect?.(move)
        }
    }

    if (!moves || moves.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum movimento disponível</Text>
            </View>
        )
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
        >
            {moves.map((move) => (
                <Pressable
                    key={move.move.id}
                    onPress={() => handleMovePress(move)}
                    disabled={!selectable}
                >
                    <MoveCard
                        move={move}
                        isSelected={selectable && selectedMoveId === move.move.id}
                    />
                </Pressable>
            ))}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontStyle: 'italic',
    },
})
