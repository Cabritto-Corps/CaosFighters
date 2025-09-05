import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import ChaosButton from './ChaosButton';
import ChaosModal from './ChaosModal';

interface ResultModalProps {
  visible: boolean;
  onClose: () => void;
  victory: boolean;
  score: number;
  enemyName: string;
  playerName?: string;
  experience?: number;
  coinsEarned?: number;
}

export default function ResultModal({
  visible,
  onClose,
  victory,
  score,
  enemyName,
  playerName = "Guerreiro",
  experience = 0,
  coinsEarned = 0,
}: ResultModalProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animação pulsante para o resultado
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => pulse());
      };
      pulse();

      // Animação da pontuação
      Animated.timing(scoreAnim, {
        toValue: score,
        duration: 2000,
        useNativeDriver: false,
      }).start();
    } else {
      pulseAnim.setValue(1);
      scoreAnim.setValue(0);
    }
  }, [visible, score]);

  const getResultEmoji = () => {
    if (victory) {
      return score > 1000 ? '🏆' : '👑';
    }
    return '💀';
  };

  const getResultColor = () => {
    if (victory) {
      return score > 1000 ? '#FFD700' : '#00FF88';
    }
    return '#FF6B6B';
  };

  const getResultTitle = () => {
    if (victory) {
      if (score > 1500) return 'VITÓRIA ÉPICA!';
      if (score > 1000) return 'VITÓRIA PERFEITA!';
      return 'VITÓRIA!';
    }
    return 'DERROTA...';
  };

  const getResultMessage = () => {
    if (victory) {
      if (score > 1500) return `Você obliterou ${enemyName} com maestria absoluta!`;
      if (score > 1000) return `Você derrotou ${enemyName} com estilo!`;
      return `Você venceu ${enemyName} em uma batalha épica!`;
    }
    return `${enemyName} provou ser um adversário formidável...`;
  };

  return (
    <ChaosModal
      visible={visible}
      onClose={onClose}
      showCloseButton={false}
      backdropOpacity={0.9}
    >
      <View style={{ alignItems: 'center', gap: 24 }}>
        {/* Emoji e Título do Resultado */}
        <Animated.View 
          style={{
            alignItems: 'center',
            transform: [{ scale: pulseAnim }],
          }}
        >
          <Text style={{
            fontSize: 80,
            marginBottom: 16,
            textShadowColor: getResultColor(),
            textShadowRadius: 20,
            textShadowOffset: { width: 0, height: 0 },
          }}>
            {getResultEmoji()}
          </Text>
          
          <Text style={{
            fontSize: 28,
            fontWeight: '900',
            color: getResultColor(),
            letterSpacing: 2,
            textAlign: 'center',
            textShadowColor: '#000',
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 8,
          }}>
            {getResultTitle()}
          </Text>
        </Animated.View>

        {/* Mensagem da Batalha */}
        <Text style={{
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: 24,
          letterSpacing: 0.5,
        }}>
          {getResultMessage()}
        </Text>

        {/* Pontuação Principal */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          padding: 24,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: `${getResultColor()}40`,
          width: '100%',
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 18,
            color: '#94a3b8',
            fontWeight: '600',
            marginBottom: 8,
            letterSpacing: 1,
          }}>
            PONTUAÇÃO FINAL
          </Text>
          
          <Animated.Text style={{
            fontSize: 36,
            fontWeight: '900',
            color: getResultColor(),
            letterSpacing: 2,
            textShadowColor: '#000',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 4,
          }}>
            {scoreAnim.interpolate({
              inputRange: [0, score],
              outputRange: ['0', score.toString()],
              extrapolate: 'clamp',
            })}
          </Animated.Text>
        </View>

        {/* Recompensas */}
        {victory && (
          <View style={{
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            padding: 20,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(0, 255, 136, 0.3)',
            width: '100%',
          }}>
            <Text style={{
              fontSize: 16,
              color: '#00FF88',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 16,
              letterSpacing: 1,
            }}>
              🎁 RECOMPENSAS
            </Text>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
            }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>EXP</Text>
                <Text style={{
                  color: '#00FF88',
                  fontSize: 20,
                  fontWeight: '700',
                  marginTop: 4,
                }}>
                  +{experience}
                </Text>
              </View>
              
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>MOEDAS</Text>
                <Text style={{
                  color: '#FFD700',
                  fontSize: 20,
                  fontWeight: '700',
                  marginTop: 4,
                }}>
                  +{coinsEarned}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Botões de Ação */}
        <View style={{ gap: 12, width: '100%', marginTop: 16 }}>
          {victory ? (
            <>
              <ChaosButton
                title="PRÓXIMA BATALHA"
                onPress={onClose}
                variant="success"
                size="large"
              />
              <ChaosButton
                title="Voltar à Arena"
                onPress={onClose}
                variant="secondary"
                size="medium"
              />
            </>
          ) : (
            <>
              <ChaosButton
                title="TENTAR NOVAMENTE"
                onPress={onClose}
                variant="danger"
                size="large"
              />
              <ChaosButton
                title="Voltar à Arena"
                onPress={onClose}
                variant="secondary"
                size="medium"
              />
            </>
          )}
        </View>
      </View>
    </ChaosModal>
  );
}
