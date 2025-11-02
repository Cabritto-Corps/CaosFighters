import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text } from 'react-native'

export interface AttackInfo {
    id: number
    name: string
    power?: number
    accuracy?: number
    effect_chance?: number
}

interface BattleAttackButtonProps {
    attack: AttackInfo
    onPress: () => void
    onLongPress: () => void
    disabled?: boolean
    delay?: number // opcional para animar entrada com atraso
}

export default function BattleAttackButton({
    attack,
    onPress,
    onLongPress,
    disabled = false,
    delay = 0,
}: BattleAttackButtonProps) {
    const [isPressed, setIsPressed] = useState(false)
    const scaleAnim = useRef(new Animated.Value(0.8)).current
    const opacityAnim = useRef(new Animated.Value(0)).current
    const longPressTriggered = useRef(false)

    const handlePressIn = () => {
        longPressTriggered.current = false
        setIsPressed(true)
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start()
    }

    const handlePressOut = () => {
        // Se o long press foi disparado, não dispara o onPress
        if (!longPressTriggered.current) {
            onPress()
        }
        setIsPressed(false)
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start()
    }

    const handleLongPress = () => {
        longPressTriggered.current = true
        onLongPress()
    }

    useEffect(() => {
        // animação de entrada (fade + scale)
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                delay,
                useNativeDriver: true,
            }),
        ]).start()
    }, [delay, opacityAnim, scaleAnim])

    const isHealingMove = attack.power !== undefined && attack.power < 0

    return (
        <Animated.View style={[{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
            <Pressable
                onLongPress={handleLongPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                delayLongPress={1000}
                style={[styles.button, isPressed && styles.buttonPressed, disabled && styles.buttonDisabled]}
            >
                <Text numberOfLines={1} style={[styles.attackName, disabled && styles.attackNameDisabled]}>
                    {attack.name}
                </Text>

                {attack.power !== undefined && (
                    <Text
                        style={[
                            styles.attackPower,
                            isHealingMove ? styles.powerHealing : styles.powerDamage,
                            disabled && styles.attackNameDisabled,
                        ]}
                    >
                        {Math.abs(attack.power)}
                    </Text>
                )}

                <Text numberOfLines={2} style={[styles.hintText, disabled && styles.attackNameDisabled]}>
                    Segure para detalhes
                </Text>
            </Pressable>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    button: {
        width: '100%',
        paddingVertical: 20,
        marginVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'rgba(255, 215, 0, 0.6)',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 110,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonPressed: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderColor: '#FFD700',
        shadowOpacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    buttonDisabled: {
        opacity: 0.4,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        backgroundColor: 'rgba(17, 24, 39, 0.5)',
    },
    attackName: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    attackNameDisabled: {
        color: '#64748b',
    },
    attackPower: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: 1,
    },
    powerDamage: {
        color: '#FF6B6B',
        textShadowColor: '#FF0000',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 6,
    },
    powerHealing: {
        color: '#00FF88',
        textShadowColor: '#00AA55',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 6,
    },
    hintText: {
        color: '#94a3b8',
        fontSize: 9,
        fontWeight: '600',
        fontStyle: 'italic',
        marginTop: 4,
        opacity: 0.7,
    },
})
