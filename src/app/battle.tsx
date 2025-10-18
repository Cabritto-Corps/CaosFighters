import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ChaosButton from "../components/ui/ChaosButton";
import ChaoticBackground from "../components/ui/ChaoticBackground";

const { width, height } = Dimensions.get("window");

// Mapeamento de personagens disponíveis
const CHARACTERS = {
  pikachu: {
    name: "Pikachu",
    image: require("../../assets/images/pikachu.png"),
  },
  vindiesel: {
    name: "Vin Diesel",
    image: require("../../assets/images/vindiesel.png"),
  },
};

// Ataques disponíveis
const ATTACKS = [
  { id: 1, name: "Golpe Devastador", damage: [80, 120], cost: 20, icon: "⚔️" },
  { id: 2, name: "Rajada de Fogo", damage: [60, 100], cost: 15, icon: "🔥" },
  { id: 3, name: "Cura Mística", damage: [-50, -80], cost: 25, icon: "💚" },
  { id: 4, name: "Ataque Básico", damage: [40, 70], cost: 10, icon: "👊" },
];

export default function BattleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Estados da batalha
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(100);
  const [turn, setTurn] = useState<'player' | 'enemy'>('player');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
  const [currentDamage, setCurrentDamage] = useState(0);

  // Dados do inimigo e jogador
  const enemyCharacter = params.enemyCharacter as keyof typeof CHARACTERS || "vindiesel";
  const playerCharacter = params.playerCharacter as keyof typeof CHARACTERS || "pikachu";
  
  const enemy = {
    name: params.enemyName as string || CHARACTERS[enemyCharacter].name,
    image: CHARACTERS[enemyCharacter].image,
    maxHP: 100,
    power: params.enemyPower as string || "800",
    level: params.enemyLevel as string || "15",
  };

  const player = {
    name: params.playerName as string || CHARACTERS[playerCharacter].name,
    image: CHARACTERS[playerCharacter].image,
    maxHP: 100,
  };

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnimPlayer = useRef(new Animated.Value(0)).current;
  const shakeAnimEnemy = useRef(new Animated.Value(0)).current;
  const battleAnimScale = useRef(new Animated.Value(1)).current;
  
  // Novas animações de ataque
  const attackEffectOpacity = useRef(new Animated.Value(0)).current;
  const attackEffectScale = useRef(new Animated.Value(0.5)).current;
  const attackEffectRotation = useRef(new Animated.Value(0)).current;
  const damageTextOpacity = useRef(new Animated.Value(0)).current;
  const damageTextTranslateY = useRef(new Animated.Value(0)).current;
  const damageTextScale = useRef(new Animated.Value(0.5)).current;
  const screenFlashOpacity = useRef(new Animated.Value(0)).current;
  const characterAttackScale = useRef(new Animated.Value(1)).current;
  const characterAttackRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    setBattleLog([`A batalha entre você e ${enemy.name} começou!`]);
  }, []);

  useEffect(() => {
    if (playerHP <= 0) {
      setBattleEnded(true);
      setWinner('enemy');
      setBattleLog(prev => [...prev, `Você foi derrotado por ${enemy.name}!`]);
    } else if (enemyHP <= 0) {
      setBattleEnded(true);
      setWinner('player');
      setBattleLog(prev => [...prev, `Você derrotou ${enemy.name}!`]);
    }
  }, [playerHP, enemyHP]);

  useEffect(() => {
    if (turn === 'enemy' && !battleEnded) {
      // IA simples do inimigo
      const timer = setTimeout(() => {
        enemyAttack();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, battleEnded]);

  const animateAttack = (attacker: 'player' | 'enemy', target: 'player' | 'enemy', damage: number) => {
    const targetAnim = target === 'player' ? shakeAnimPlayer : shakeAnimEnemy;
    
    // Definir o dano atual para exibição
    setCurrentDamage(damage);
    
    // Reset das animações
    attackEffectOpacity.setValue(0);
    attackEffectScale.setValue(0.5);
    attackEffectRotation.setValue(0);
    damageTextOpacity.setValue(0);
    damageTextTranslateY.setValue(0);
    damageTextScale.setValue(0.5);
    screenFlashOpacity.setValue(0);
    characterAttackScale.setValue(1);
    characterAttackRotation.setValue(0);

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
    ]).start();
  };

  const playerAttack = (attack: typeof ATTACKS[0]) => {
    if (turn !== 'player' || battleEnded) return;

    const damage = Math.floor(Math.random() * (attack.damage[1] - attack.damage[0] + 1)) + attack.damage[0];
    
    if (damage > 0) {
      // Ataque
      setEnemyHP(prev => Math.max(0, prev - damage));
      setBattleLog(prev => [...prev, `Você usou ${attack.name} e causou ${damage} de dano!`]);
      animateAttack('player', 'enemy', damage);
    } else {
      // Cura
      const healing = Math.abs(damage);
      setPlayerHP(prev => Math.min(100, prev + healing));
      setBattleLog(prev => [...prev, `Você usou ${attack.name} e curou ${healing} HP!`]);
      animateAttack('player', 'player', healing);
    }
    
    setTurn('enemy');
  };

  const enemyAttack = () => {
    const attacks = ATTACKS.filter(a => a.damage[0] > 0); // Só ataques
    const randomAttack = attacks[Math.floor(Math.random() * attacks.length)];
    const damage = Math.floor(Math.random() * (randomAttack.damage[1] - randomAttack.damage[0] + 1)) + randomAttack.damage[0];
    
    setPlayerHP(prev => Math.max(0, prev - damage));
    setBattleLog(prev => [...prev, `${enemy.name} usou ${randomAttack.name} e causou ${damage} de dano!`]);
    animateAttack('enemy', 'player', damage);
    
    setTurn('player');
  };

  const handleEndBattle = () => {
    // Navegar para resultado ou voltar
    router.back();
  };

  const getHPColor = (hp: number) => {
    if (hp > 60) return '#00FF88';
    if (hp > 30) return '#FFD700';
    return '#FF6B6B';
  };

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
      <Animated.View 
        style={[
          styles.screenFlash, 
          { opacity: screenFlashOpacity }
        ]} 
      />

      {/* Efeito visual de ataque */}
      <Animated.View 
        style={[
          styles.attackEffect,
          {
            opacity: attackEffectOpacity,
            transform: [
              { scale: attackEffectScale },
              { rotate: attackEffectRotation.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg'],
              })}
            ]
          }
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
                <View style={[styles.hpBar, { 
                  width: `${enemyHP}%`, 
                  backgroundColor: getHPColor(enemyHP) 
                }]} />
              </View>
              <Text style={[styles.hpText, { color: getHPColor(enemyHP) }]}>
                {enemyHP}/100
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
                <View style={[styles.hpBar, { 
                  width: `${playerHP}%`, 
                  backgroundColor: getHPColor(playerHP) 
                }]} />
              </View>
              <Text style={[styles.hpText, { color: getHPColor(playerHP) }]}>
                {playerHP}/100
              </Text>
            </View>
          </View>
        </View>

        {/* Arena Central - Personagens */}
        <View style={styles.arena}>
          {/* Inimigo */}
          <Animated.View style={[
            styles.characterContainer, 
            styles.enemyContainer,
            { 
              transform: [
                { translateX: shakeAnimEnemy },
                { scale: characterAttackScale },
                { rotate: characterAttackRotation.interpolate({
                  inputRange: [-15, 15],
                  outputRange: ['-15deg', '15deg'],
                })}
              ]
            }
          ]}>
            <Image 
              source={enemy.image}
              style={[styles.characterSprite, { opacity: enemyHP > 0 ? 1 : 0.3 }]}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Indicador de Turno */}
          <View style={styles.turnIndicator}>
            <Text style={[styles.turnText, { 
              color: turn === 'player' ? '#00FF88' : '#FF6B6B' 
            }]}>
              {battleEnded 
                ? (winner === 'player' ? 'VITÓRIA!' : 'DERROTA!') 
                : (turn === 'player' ? 'SEU TURNO' : 'TURNO INIMIGO')
              }
            </Text>
          </View>

          {/* Jogador */}
          <Animated.View style={[
            styles.characterContainer, 
            styles.playerContainer,
            { 
              transform: [
                { translateX: shakeAnimPlayer },
                { scale: characterAttackScale },
                { rotate: characterAttackRotation.interpolate({
                  inputRange: [-15, 15],
                  outputRange: ['-15deg', '15deg'],
                })}
              ]
            }
          ]}>
            <Image 
              source={player.image}
              style={[styles.characterSprite, { opacity: playerHP > 0 ? 1 : 0.3 }]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Texto de dano flutuante */}
        <Animated.View 
          style={[
            styles.damageText,
            {
              opacity: damageTextOpacity,
              transform: [
                { translateY: damageTextTranslateY },
                { scale: damageTextScale }
              ]
            }
          ]}
        >
          <Text style={styles.damageTextContent}>-{currentDamage}</Text>
        </Animated.View>

        {/* Ataques - Grid 2x2 na parte inferior */}
        <View style={styles.attacksContainer}>
          {!battleEnded ? (
            <>
              {turn === 'player' && (
                <View style={styles.attacksGrid}>
                  {ATTACKS.map((attack) => (
                    <Pressable
                      key={attack.id}
                      onPress={() => playerAttack(attack)}
                      style={({ pressed }) => [
                        styles.attackButton,
                        {
                          backgroundColor: 'rgba(255, 215, 0, 0.2)',
                          borderColor: 'rgba(255, 215, 0, 0.5)',
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        }
                      ]}
                    >
                      <Text style={styles.attackName}>
                        {attack.name}
                      </Text>
                    </Pressable>
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
            <View style={[styles.resultContainer, {
              backgroundColor: winner === 'player' 
                ? 'rgba(0, 255, 136, 0.2)' 
                : 'rgba(255, 107, 107, 0.2)',
              borderColor: winner === 'player' 
                ? 'rgba(0, 255, 136, 0.5)' 
                : 'rgba(255, 107, 107, 0.5)',
            }]}>
              <Text style={styles.resultEmoji}>
                {winner === 'player' ? '🏆' : '💀'}
              </Text>
              
              <Text style={[styles.resultText, {
                color: winner === 'player' ? '#00FF88' : '#FF6B6B'
              }]}>
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
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>✕</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
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
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'absolute',
    top: 250,
    left: '49%',
    transform: [{ translateX: -50 }],
  },
  turnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Ataques
  attacksContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
  },
  attacksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  attackButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  attackName: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  waitingContainer: {
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  waitingText: {
    color: '#94a3b8',
    fontSize: 14,
    fontStyle: 'italic',
  },

  // Resultado da Batalha
  resultContainer: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
  },
  resultEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
  },

  // Botão de voltar
  backButton: {
    position: 'absolute',
    top: 50,
    right: width * 0.5 - 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: '600',
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
});
