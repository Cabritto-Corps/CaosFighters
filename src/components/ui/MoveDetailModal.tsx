import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

export interface MoveDetail {
    id?: number
    name: string
    power?: number
    accuracy?: number
    effect_chance?: number
    effect?: string
    type?: string
}

interface MoveDetailModalProps {
    visible: boolean
    move: MoveDetail | null
    onClose: () => void
}

export default function MoveDetailModal({ visible, move, onClose }: MoveDetailModalProps) {
    const getTypeColor = (type?: string) => {
        const colors: Record<string, string> = {
            fire: '#FF6B6B',
            water: '#4A90E2',
            grass: '#7ED321',
            electric: '#FFD700',
            ice: '#66FFFF',
            fighting: '#D946EF',
            poison: '#A020F0',
            ground: '#CD7F32',
            flying: '#87CEEB',
            psychic: '#FF69B4',
            bug: '#90EE90',
            rock: '#A9A9A9',
            ghost: '#9370DB',
            dragon: '#FF1493',
            dark: '#2F4F4F',
            steel: '#C0C0C0',
            fairy: '#FFB6C1',
        }
        return colors[type?.toLowerCase() || ''] || '#94a3b8'
    }

    const isHealingMove = move?.power !== undefined && move.power < 0

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.modalContent} onPress={() => {}}>
                    {move && (
                        <>
                            {/* Close Button */}
                            <Pressable style={styles.closeButton} onPress={onClose}>
                                <Text style={styles.closeButtonText}>✕</Text>
                            </Pressable>

                            {/* Title */}
                            <Text style={styles.moveName}>{move.name}</Text>

                            {/* Type Badge */}
                            {move.type && (
                                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(move.type) }]}>
                                    <Text style={styles.typeBadgeText}>{move.type.toUpperCase()}</Text>
                                </View>
                            )}

                            {/* Stats Grid */}
                            <View style={styles.statsGrid}>
                                {/* Power */}
                                {move.power !== undefined && (
                                    <View style={styles.statCard}>
                                        <Text style={styles.statLabel}>PODER</Text>
                                        <Text
                                            style={[styles.statValue, { color: isHealingMove ? '#00FF88' : '#FF6B6B' }]}
                                        >
                                            {Math.abs(move.power)}
                                        </Text>
                                        {isHealingMove && <Text style={styles.statUnit}>cura</Text>}
                                    </View>
                                )}

                                {/* Accuracy */}
                                {move.accuracy !== undefined && (
                                    <View style={styles.statCard}>
                                        <Text style={styles.statLabel}>ACURÁCIA</Text>
                                        <Text style={styles.statValue}>{move.accuracy}%</Text>
                                    </View>
                                )}

                                {/* Effect Chance */}
                                {move.effect_chance !== undefined && move.effect_chance > 0 && (
                                    <View style={styles.statCard}>
                                        <Text style={styles.statLabel}>EFEITO</Text>
                                        <Text style={styles.statValue}>{move.effect_chance}%</Text>
                                    </View>
                                )}
                            </View>

                            {/* Effect Description */}
                            {move.effect && (
                                <View style={styles.effectSection}>
                                    <Text style={styles.effectLabel}>DESCRIÇÃO DO EFEITO</Text>
                                    <Text style={styles.effectText}>{move.effect}</Text>
                                </View>
                            )}
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    closeButtonText: {
        fontSize: 18,
        color: '#FFD700',
        fontWeight: 'bold',
    },
    moveName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 12,
    },
    typeBadge: {
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 20,
    },
    typeBadgeText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        minWidth: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
    },
    statLabel: {
        color: '#94a3b8',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        color: '#FFD700',
        fontSize: 20,
        fontWeight: '700',
    },
    statUnit: {
        color: '#64748b',
        fontSize: 9,
        marginTop: 2,
        fontStyle: 'italic',
    },
    effectSection: {
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FFD700',
    },
    effectLabel: {
        color: '#FFD700',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    effectText: {
        color: '#cbd5e1',
        fontSize: 13,
        lineHeight: 18,
    },
    bottomButton: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    bottomButtonText: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '600',
    },
})
