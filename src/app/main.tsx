import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import ChaosButton from "../components/ui/ChaosButton";
import ChaoticBackground from "../components/ui/ChaoticBackground";
import ConfigModal from "../components/ui/ConfigModal";
import ResultModal from "../components/ui/ResultModal";

const { width, height } = Dimensions.get("window");

// Personagens aleatórios de template
const RANDOM_CHARACTERS = [
  {
    id: 1,
    name: "Pikachu",
    level: 15,
    power: 850,
    image: require("../../assets/images/pikachu.png"),
    imageType: "file",
    description: "É pika e é chu"
  },
  {
    id: 2,
    name: "Vin Diesel",
    level: 22,
    power: 1100,
    image: require("../../assets/images/vindiesel.png"),
    imageType: "file",
    description: "É vin e é diesel"
  },
];

export default function MainScreen() {
  const router = useRouter();
  const [currentCharacter, setCurrentCharacter] = useState(RANDOM_CHARACTERS[0]);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [lastBattleResult, setLastBattleResult] = useState({
    victory: true,
    score: 1250,
    enemyName: "Pikachu",
    experience: 150,
    coinsEarned: 75,
  });

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

    return () => {
      clearInterval(characterInterval);
    };
  }, []);

  const handleStartBattle = () => {
    router.push({
      pathname: "/battle" as any,
      params: {
        enemyName: currentCharacter.name,
        enemyPower: currentCharacter.power,
        enemyLevel: currentCharacter.level,
        enemyIcon: currentCharacter.imageType === "emoji" ? currentCharacter.image : "👾"
      }
    });
  };



  const handleSettings = () => {
    setConfigModalVisible(true);
  };

  const handleAccount = () => {
    router.push("/profile" as any);
  };

  const handleRandomizeCharacter = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_CHARACTERS.length);
    setCurrentCharacter(RANDOM_CHARACTERS[randomIndex]);
  };


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

      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
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
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 50,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 24,
                fontWeight: '700',
                color: '#ffffff',
                letterSpacing: 0.5,
              }}>
                Arena de Batalha
              </Text>
              <Text style={{
                color: '#94a3b8',
                fontSize: 14,
                marginTop: 2,
              }}>
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
          <Animated.View style={{
            alignItems: 'center',
            marginVertical: 40,
            transform: [{ scale: pulseAnim }],
          }}>
            <Pressable
              onPress={handleRandomizeCharacter}
              style={({ pressed }) => ({
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 24,
                padding: 32,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                width: width * 0.85,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View style={{ marginBottom: 20 }}>
                {renderCharacterImage(currentCharacter)}
              </View>
              
              <Text style={{
                fontSize: 22,
                fontWeight: '600',
                color: '#ffffff',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                {currentCharacter.name}
              </Text>
              
              <Text style={{
                fontSize: 14,
                color: '#94a3b8',
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 20,
              }}>
                {currentCharacter.description}
              </Text>
              
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: 16,
                borderRadius: 16,
              }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500' }}>Nível</Text>
                  <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '600', marginTop: 4 }}>
                    {currentCharacter.level}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500' }}>Poder</Text>
                  <Text style={{ color: '#f87171', fontSize: 18, fontWeight: '600', marginTop: 4 }}>
                    {currentCharacter.power}
                  </Text>
                </View>
              </View>
              
              <Text style={{
                color: '#64748b',
                fontSize: 12,
                marginTop: 16,
                fontStyle: 'italic',
              }}>
                Toque para trocar adversário
              </Text>
            </Pressable>
          </Animated.View>

          {/* Botão Principal - Iniciar Batalha */}
          <View style={{ marginVertical: 32 }}>
            <ChaosButton
              title="INICIAR BATALHA"
              onPress={handleStartBattle}
              variant="primary"
              size="large"
            />
          </View>

          {/* Botão de Sair */}
          <View style={{ marginTop: 24 }}>
            <ChaosButton
              title="← Sair da Arena"
              onPress={() => router.replace("/")}
              variant="secondary"
              size="medium"
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modais */}
      <ConfigModal
        visible={configModalVisible}
        onClose={() => setConfigModalVisible(false)}
      />

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
  );
}
