import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ChaosButton from "../components/ui/ChaosButton";
import ChaoticBackground from "../components/ui/ChaoticBackground";

const { width, height } = Dimensions.get("window");

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
  const [playerMP, setPlayerMP] = useState(100);
  const [turn, setTurn] = useState<'player' | 'enemy'>('player');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);

  // Dados do inimigo e jogador
  const enemy = {
    name: params.enemyName as string || "Inimigo Misterioso",
    icon: params.enemyIcon as string || "👾",
    maxHP: 100,
    power: params.enemyPower as string || "800",
    level: params.enemyLevel as string || "15",
  };

  const player = {
    name: "Guerreiro Supremo", // Pode vir dos parâmetros ou localStorage futuramente
    icon: "⚔️",
    maxHP: 100,
  };

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnimPlayer = useRef(new Animated.Value(0)).current;
  const shakeAnimEnemy = useRef(new Animated.Value(0)).current;
  const battleAnimScale = useRef(new Animated.Value(1)).current;

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

  const animateHit = (target: 'player' | 'enemy') => {
    const anim = target === 'player' ? shakeAnimPlayer : shakeAnimEnemy;
    
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação de escala da batalha
    Animated.sequence([
      Animated.timing(battleAnimScale, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(battleAnimScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const playerAttack = (attack: typeof ATTACKS[0]) => {
    if (playerMP < attack.cost || turn !== 'player' || battleEnded) return;

    const damage = Math.floor(Math.random() * (attack.damage[1] - attack.damage[0] + 1)) + attack.damage[0];
    
    setPlayerMP(prev => prev - attack.cost);
    
    if (damage > 0) {
      // Ataque
      setEnemyHP(prev => Math.max(0, prev - damage));
      setBattleLog(prev => [...prev, `Você usou ${attack.name} e causou ${damage} de dano!`]);
      animateHit('enemy');
    } else {
      // Cura
      const healing = Math.abs(damage);
      setPlayerHP(prev => Math.min(100, prev + healing));
      setBattleLog(prev => [...prev, `Você usou ${attack.name} e curou ${healing} HP!`]);
    }
    
    setTurn('enemy');
  };

  const enemyAttack = () => {
    const attacks = ATTACKS.filter(a => a.damage[0] > 0); // Só ataques
    const randomAttack = attacks[Math.floor(Math.random() * attacks.length)];
    const damage = Math.floor(Math.random() * (randomAttack.damage[1] - randomAttack.damage[0] + 1)) + randomAttack.damage[0];
    
    setPlayerHP(prev => Math.max(0, prev - damage));
    setBattleLog(prev => [...prev, `${enemy.name} usou ${randomAttack.name} e causou ${damage} de dano!`]);
    animateHit('player');
    
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
            {/* Barra de MP do Jogador */}
            <View style={styles.mpContainer}>
              <View style={styles.mpBarBg}>
                <View style={[styles.mpBar, { width: `${playerMP}%` }]} />
              </View>
              <Text style={styles.mpText}>{playerMP}/100 MP</Text>
            </View>
          </View>
        </View>

        {/* Arena Central - Personagens */}
        <View style={styles.arena}>
          {/* Inimigo */}
          <Animated.View style={[
            styles.characterContainer, 
            styles.enemyContainer,
            { transform: [{ translateX: shakeAnimEnemy }] }
          ]}>
            <Text style={[styles.characterSprite, { opacity: enemyHP > 0 ? 1 : 0.3 }]}>
              {enemy.icon}
            </Text>
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
            { transform: [{ translateX: shakeAnimPlayer }] }
          ]}>
            <Text style={[styles.characterSprite, { opacity: playerHP > 0 ? 1 : 0.3 }]}>
              {player.icon}
            </Text>
          </Animated.View>
        </View>

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
                      disabled={playerMP < attack.cost}
                      style={({ pressed }) => [
                        styles.attackButton,
                        {
                          backgroundColor: playerMP >= attack.cost 
                            ? 'rgba(255, 215, 0, 0.2)' 
                            : 'rgba(100, 100, 100, 0.2)',
                          borderColor: playerMP >= attack.cost 
                            ? 'rgba(255, 215, 0, 0.5)' 
                            : 'rgba(100, 100, 100, 0.5)',
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        }
                      ]}
                    >
                      <Text style={styles.attackName}>
                        {attack.name}
                      </Text>
                      <Text style={[styles.attackCost, {
                        color: playerMP >= attack.cost ? '#94a3b8' : '#666'
                      }]}>
                        {attack.cost} MP
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
  mpContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  mpBarBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    height: 6,
    width: '80%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  mpBar: {
    height: '100%',
    backgroundColor: '#0099FF',
    borderRadius: 3,
  },
  mpText: {
    color: '#0099FF',
    fontSize: 9,
    marginTop: 2,
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
    fontSize: 80,
  },
  turnIndicator: {
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    marginBottom: 4,
  },
  attackCost: {
    fontSize: 10,
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
});
