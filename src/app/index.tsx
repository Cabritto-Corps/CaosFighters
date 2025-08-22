import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  Text,
  View
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação pulsante para o botão
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      
      {/* Background com gradiente */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      {/* Efeito de pontos brilhantes no fundo */}
      <View style={{
        position: 'absolute',
        width: width,
        height: height,
        opacity: 0.3,
      }}>
        {[...Array(50)].map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 4 + 1,
              height: Math.random() * 4 + 1,
              backgroundColor: '#FFD700',
              borderRadius: 10,
              left: Math.random() * width,
              top: Math.random() * height,
              shadowColor: '#FFD700',
              shadowOpacity: 0.8,
              shadowRadius: 5,
              elevation: 5,
            }}
          />
        ))}
      </View>

      <Animated.View 
        style={{
          flex: 1,
          paddingHorizontal: 32,
          paddingTop: 80,
          paddingBottom: 60,
          justifyContent: 'space-between',
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {/* Header do jogo */}
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{
            fontSize: 48,
            fontWeight: '900',
            color: '#FFD700',
            textAlign: 'center',
            letterSpacing: 3,
            textShadowColor: '#FF4444',
            textShadowOffset: { width: 3, height: 3 },
            textShadowRadius: 10,
            marginBottom: 8,
          }}>
            BATTLE
          </Text>
          <Text style={{
            fontSize: 36,
            fontWeight: '700',
            color: '#FF6B6B',
            textAlign: 'center',
            letterSpacing: 2,
            textShadowColor: '#000',
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 5,
            marginBottom: 16,
          }}>
            ARENA
          </Text>
          
          <View style={{
            width: 120,
            height: 4,
            backgroundColor: '#FFD700',
            borderRadius: 2,
            marginBottom: 32,
            shadowColor: '#FFD700',
            shadowOpacity: 0.8,
            shadowRadius: 10,
            elevation: 10,
          }} />

          <Text style={{
            fontSize: 18,
            color: '#A0A0A0',
            textAlign: 'center',
            lineHeight: 26,
            letterSpacing: 1,
          }}>
            Prepare-se para batalhas épicas!{'\n'}
            Escolha seus lutadores e domine a arena!
          </Text>
        </View>

        {/* Área central com ícones de energia */}
        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
        }}>
          {/* Círculo de energia central */}
          <Animated.View style={{
            width: 150,
            height: 150,
            borderRadius: 100,
            borderWidth: 3,
            borderColor: '#FFD700',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            transform: [{ scale: pulseAnim }],
          }}>
            <Text style={{
              fontSize: 40,
              color: '#FFD700',
            }}>
              ⚡
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#FFD700',
              fontWeight: '600',
              letterSpacing: 1,
              marginTop: 8,
            }}>
              ENERGIA
            </Text>
          </Animated.View>

          {/* Símbolos flutuantes */}
          <View style={{
            position: 'absolute',
            width: 300,
            height: 300,
            justifyContent: 'space-around',
            alignItems: 'center',
          }}>
            {['🔥', '💧', '🌿', '⚡'].map((emoji, index) => (
              <Text
                key={index}
                style={{
                  position: 'absolute',
                  fontSize: 30,
                  top: index * 75,
                  left: (index % 2) * 250,
                  transform: [
                    { rotate: `${index * 90}deg` }
                  ],
                  opacity: 0.7,
                }}
              >
                {emoji}
              </Text>
            ))}
          </View>
        </View>

        {/* Botões de ação */}
        <View style={{ gap: 16 }}>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#FF4444' : '#FF6B6B',
              paddingVertical: 18,
              paddingHorizontal: 40,
              borderRadius: 25,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#FFD700',
              shadowColor: '#FF6B6B',
              shadowOpacity: 0.5,
              shadowRadius: 15,
              shadowOffset: { width: 0, height: 8 },
              elevation: 15,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Text style={{
              color: 'white',
              fontSize: 20,
              fontWeight: '800',
              letterSpacing: 1.5,
              textShadowColor: '#000',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 3,
            }}>
              ⚔️ ENTRAR NA ARENA
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/register")}
            style={({ pressed }) => ({
              backgroundColor: pressed ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.1)',
              paddingVertical: 18,
              paddingHorizontal: 40,
              borderRadius: 25,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#FFD700',
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Text style={{
              color: '#FFD700',
              fontSize: 18,
              fontWeight: '700',
              letterSpacing: 1,
            }}>
              🛡️ CRIAR CONTA
            </Text>
          </Pressable>

          {/* Info adicional */}
          <Text style={{
            color: '#666',
            fontSize: 12,
            textAlign: 'center',
            marginTop: 16,
            letterSpacing: 0.5,
          }}>
            Junte-se a milhares de treinadores!
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
