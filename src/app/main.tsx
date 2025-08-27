import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    Text,
    View
} from "react-native";

const { width, height } = Dimensions.get("window");

// Personagens aleatórios de template
const RANDOM_CHARACTERS = [
  {
    id: 1,
    name: "Pikachu",
    level: 15,
    power: 850,
          image: require("../../assets/images/pikachu.jpg"),
    imageType: "file",
    description: "É pika e é chu"
  },
  {
    id: 2,
    name: "Vin Diesel",
    level: 22,
    power: 1100,
    image: require("../../assets/images/vindiesel.jpeg"),
    imageType: "file",
    description: "É vin e é diesel"
  },
  {
    id: 3,
    name: "Mago Elemental",
    level: 12,
    power: 720,
    image: "🔮",
    imageType: "emoji",
    description: "Mestre dos elementos da natureza"
  },
  {
    id: 4,
    name: "Arqueiro Místico",
    level: 18,
    power: 950,
    image: "🏹",
    imageType: "emoji",
    description: "Precisão letal com poderes arcanos"
  },
  {
    id: 5,
    name: "Dragão Ancestral",
    level: 25,
    power: 1200,
    image: "🐉",
    imageType: "emoji",
    description: "Lenda viva dos tempos antigos"
  },
  {
    id: 6,
    name: "Ninja Sombra",
    level: 20,
    power: 1050,
    image: "🥷",
    imageType: "emoji",
    description: "Assassino silencioso das sombras"
  }
];

export default function MainScreen() {
  const router = useRouter();
  const [currentCharacter, setCurrentCharacter] = useState(RANDOM_CHARACTERS[0]);

  // Função para renderizar a imagem ou emoji do personagem
  const renderCharacterImage = (character: typeof RANDOM_CHARACTERS[0]) => {
    if (character.imageType === "file") {
      return (
        <Image 
          source={character.image}
          style={{
            width: 120,
            height: 120,
            resizeMode: 'contain',
            borderRadius: 15,
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            padding: 10,
          }}
        />
      );
    } else {
      return (
        <Text style={{
          fontSize: 80,
          textShadowColor: '#000',
          textShadowOffset: { width: 2, height: 2 },
          textShadowRadius: 8,
        }}>
          {character.image}
        </Text>
      );
    }
  };
  
  // Animações
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
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

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
      ]).start(() => pulse());
    };
    pulse();

    // Troca de personagem aleatório a cada 10 segundos
    const characterInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * RANDOM_CHARACTERS.length);
      setCurrentCharacter(RANDOM_CHARACTERS[randomIndex]);
    }, 10000);

    return () => clearInterval(characterInterval);
  }, []);

  const handleStartBattle = () => {
    Alert.alert(
      "Iniciar Batalha!",
      `Deseja enfrentar ${currentCharacter.name}?\nPoder: ${currentCharacter.power}\nNível: ${currentCharacter.level}`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "BATALHAR!", onPress: () => Alert.alert("🔥", "Sistema de batalha em desenvolvimento!") }
      ]
    );
  };

  const handleItemShop = () => {
    Alert.alert("🛒 Loja de Itens", "Funcionalidade em desenvolvimento!");
  };

  const handleSettings = () => {
    Alert.alert("⚙️ Configurações", "Funcionalidade em desenvolvimento!");
  };

  const handleAccount = () => {
    Alert.alert("👤 Conta", "Funcionalidade em desenvolvimento!");
  };

  const handleRandomizeCharacter = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_CHARACTERS.length);
    setCurrentCharacter(RANDOM_CHARACTERS[randomIndex]);
  };


  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      
      {/* Background com gradiente */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
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
        opacity: 0.4,
      }}>
        {[...Array(40)].map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              backgroundColor: '#FFD700',
              borderRadius: 10,
              left: Math.random() * width,
              top: Math.random() * height,
              shadowColor: '#FFD700',
              shadowOpacity: 0.8,
              shadowRadius: 4,
              elevation: 4,
            }}
          />
        ))}
      </View>

      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={{
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: 50,
            paddingBottom: 30,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* Header com título e botão de conta */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 30,
          }}>
            <View>
              <Text style={{
                fontSize: 28,
                fontWeight: '900',
                color: '#FFD700',
                letterSpacing: 2,
                textShadowColor: '#FF4444',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 8,
              }}>
                ARENA DE BATALHA
              </Text>
              <Text style={{
                color: '#A0A0A0',
                fontSize: 14,
                letterSpacing: 1,
                marginTop: 4,
              }}>
                Escolha sua próxima batalha
              </Text>
            </View>
            
            <Pressable
              onPress={handleAccount}
              style={({ pressed }) => ({
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                padding: 12,
                borderRadius: 15,
                borderWidth: 2,
                borderColor: '#FFD700',
                transform: [{ scale: pressed ? 0.9 : 1 }],
              })}
            >
              <Text style={{ fontSize: 24 }}>👤</Text>
            </Pressable>
          </View>

          {/* Personagem Central */}
          <Animated.View style={{
            alignItems: 'center',
            marginVertical: 20,
            transform: [
              { scale: pulseAnim },
            ],
          }}>
            <Pressable
              onPress={handleRandomizeCharacter}
              style={({ pressed }) => ({
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                borderRadius: 25,
                padding: 20,
                alignItems: 'center',
                borderWidth: 3,
                borderColor: '#FFD700',
                shadowColor: '#FFD700',
                shadowOpacity: 0.6,
                shadowRadius: 20,
                elevation: 20,
                minWidth: width * 0.8,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              })}
            >
              <View style={{ marginBottom: 15 }}>
                {renderCharacterImage(currentCharacter)}
              </View>
              
              <Text style={{
                fontSize: 24,
                fontWeight: '800',
                color: '#FFD700',
                textAlign: 'center',
                letterSpacing: 1,
                marginBottom: 8,
              }}>
                {currentCharacter.name}
              </Text>
              
              <Text style={{
                fontSize: 14,
                color: '#A0A0A0',
                textAlign: 'center',
                marginBottom: 15,
                paddingHorizontal: 20,
              }}>
                {currentCharacter.description}
              </Text>
              
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                width: '100%',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                padding: 15,
                borderRadius: 15,
                borderWidth: 1,
                borderColor: 'rgba(255, 215, 0, 0.3)',
              }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '600' }}>NÍVEL</Text>
                  <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>
                    {currentCharacter.level}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '600' }}>PODER</Text>
                  <Text style={{ color: '#FF6B6B', fontSize: 20, fontWeight: '800' }}>
                    {currentCharacter.power}
                  </Text>
                </View>
              </View>
              
              <Text style={{
                color: '#666',
                fontSize: 12,
                marginTop: 10,
                fontStyle: 'italic',
              }}>
                Toque para trocar adversário
              </Text>
            </Pressable>
          </Animated.View>

          {/* Botão Principal - Iniciar Batalha */}
          <Pressable
            onPress={handleStartBattle}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#FF4444' : '#90CC56',
              paddingVertical: 20,
              paddingHorizontal: 40,
              borderRadius: 25,
              alignItems: 'center',
              marginVertical: 20,
              borderWidth: 3,
              borderColor: '#FFD700',
              shadowColor: '#FF6B6B',
              shadowOpacity: 0.6,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 20,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Text style={{
              color: 'white',
              fontSize: 24,
              fontWeight: '900',
              letterSpacing: 2,
              textShadowColor: '#000',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 4,
            }}>
            INICIAR BATALHA
            </Text>
          </Pressable>

          {/* Menu de Opções */}
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 15,
            marginTop: 20,
          }}>
            {/* Loja de Itens */}
            <Pressable
              onPress={handleItemShop}
              style={({ pressed }) => ({
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                padding: 20,
                borderRadius: 20,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#4F46E5',
                width: (width - 55) / 2,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              })}
            >
              <Text style={{ fontSize: 40, marginBottom: 10 }}>🛒</Text>
              <Text style={{
                color: '#4F46E5',
                fontSize: 16,
                fontWeight: '700',
                textAlign: 'center',
              }}>
                LOJA DE ITENS
              </Text>
              <Text style={{
                color: '#A0A0A0',
                fontSize: 12,
                textAlign: 'center',
                marginTop: 5,
              }}>
                Equipamentos e poções
              </Text>
            </Pressable>

            {/* Configurações */}
            <Pressable
              onPress={handleSettings}
              style={({ pressed }) => ({
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                padding: 20,
                borderRadius: 20,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#10B981',
                width: (width - 55) / 2,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              })}
            >
              <Text style={{ fontSize: 40, marginBottom: 10 }}>⚙️</Text>
              <Text style={{
                color: '#10B981',
                fontSize: 16,
                fontWeight: '700',
                textAlign: 'center',
              }}>
                CONFIGURAÇÕES
              </Text>
              <Text style={{
                color: '#A0A0A0',
                fontSize: 12,
                textAlign: 'center',
                marginTop: 5,
              }}>
                Ajustes do jogo
              </Text>
            </Pressable>
          </View>

          {/* Botão de Logout */}
          <Pressable
            onPress={() => router.replace("/")}
            style={({ pressed }) => ({
              backgroundColor: 'rgba(255, 68, 68, 0.2)',
              paddingVertical: 15,
              paddingHorizontal: 30,
              borderRadius: 20,
              alignItems: 'center',
              marginTop: 30,
              borderWidth: 2,
              borderColor: '#FF4444',
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Text style={{
              color: '#FF6B6B',
              fontSize: 16,
              fontWeight: '700',
              letterSpacing: 1,
            }}>
              🚪 SAIR DA ARENA
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
