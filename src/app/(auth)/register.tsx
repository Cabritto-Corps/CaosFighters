import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Validações
  const emailError = useMemo(() => {
    if (!email) return "";
    return /\S+@\S+\.\S+/.test(email.trim()) ? "" : "Email inválido";
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "";
    return password.length >= 6 ? "" : "Mínimo de 6 caracteres";
  }, [password]);

  const confirmError = useMemo(() => {
    if (!confirm) return "";
    return confirm === password ? "" : "As senhas não coincidem";
  }, [confirm, password]);

  const formValid =
    name && email && password && confirm && !emailError && !passwordError && !confirmError;

  async function handleRegister() {
    try {
      setLoading(true);
      // Simula uma chamada de API (troque por fetch/axios)
      await new Promise((r) => setTimeout(r, 1500));

      Alert.alert("Conta criada!", "Agora você já pode fazer login.");
      router.replace("/(auth)/login");
    } catch (e) {
      Alert.alert("Erro", "Não foi possível criar a conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

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

      {/* Efeitos de fundo */}
      <View style={{
        position: 'absolute',
        width: width,
        height: '100%',
        opacity: 0.2,
      }}>
        {[...Array(35)].map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              backgroundColor: '#00FF88',
              borderRadius: 10,
              left: Math.random() * width,
              top: Math.random() * 900,
              shadowColor: '#00FF88',
              shadowOpacity: 0.8,
              shadowRadius: 3,
              elevation: 3,
            }}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={{
              flex: 1,
              paddingHorizontal: 24,
              paddingTop: 60,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Header de volta à arena */}
            <Pressable
              onPress={() => router.back()}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 40,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ fontSize: 24, color: '#00FF88', marginRight: 8 }}>←</Text>
              <Text style={{ color: '#00FF88', fontSize: 16, fontWeight: '600' }}>
                Voltar à Arena
              </Text>
            </Pressable>

            {/* Título da tela */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <Text style={{
                fontSize: 30,
                fontWeight: '900',
                color: '#00FF88',
                textAlign: 'center',
                letterSpacing: 2,
                textShadowColor: '#0099FF',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 8,
                marginBottom: 8,
              }}>
                🛡️ NOVO GUERREIRO 🛡️
              </Text>
              <Text style={{
                color: '#A0A0A0',
                fontSize: 16,
                textAlign: 'center',
                letterSpacing: 1,
              }}>
                Junte-se à elite dos combatentes
              </Text>
              
              {/* Linha decorativa */}
              <View style={{
                width: 120,
                height: 3,
                backgroundColor: '#0099FF',
                borderRadius: 2,
                marginTop: 16,
                shadowColor: '#0099FF',
                shadowOpacity: 0.8,
                shadowRadius: 8,
                elevation: 8,
              }} />
            </View>

            {/* Card de registro */}
            <View
              style={{
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                borderRadius: 25,
                padding: 24,
                gap: 18,
                borderWidth: 2,
                borderColor: 'rgba(0, 255, 136, 0.3)',
                shadowColor: '#00FF88',
                shadowOpacity: 0.2,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                elevation: 10,
              }}
            >
              {/* Nome */}
              <View style={{ gap: 10 }}>
                <Text style={{
                  color: '#00FF88',
                  fontWeight: '700',
                  fontSize: 16,
                  letterSpacing: 1,
                }}>
                  👤 NOME DO GUERREIRO
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Digite seu nome de batalha"
                  placeholderTextColor="#666"
                  style={{
                    backgroundColor: 'rgba(11, 18, 32, 0.8)',
                    borderWidth: 2,
                    borderColor: 'rgba(0, 255, 136, 0.3)',
                    color: "white",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 15,
                    fontSize: 16,
                  }}
                  returnKeyType="next"
                />
              </View>

              {/* Email */}
              <View style={{ gap: 10 }}>
                <Text style={{
                  color: '#00FF88',
                  fontWeight: '700',
                  fontSize: 16,
                  letterSpacing: 1,
                }}>
                  📧 EMAIL DE GUERRA
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu.email@arena.com"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={{
                    backgroundColor: 'rgba(11, 18, 32, 0.8)',
                    borderWidth: 2,
                    borderColor: emailError ? "#FF4444" : 'rgba(0, 255, 136, 0.3)',
                    color: "white",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 15,
                    fontSize: 16,
                  }}
                  returnKeyType="next"
                />
                {!!emailError && (
                  <Text style={{
                    color: "#FF6B6B",
                    fontSize: 12,
                    marginLeft: 8,
                    fontWeight: '600',
                  }}>
                    ⚠️ {emailError}
                  </Text>
                )}
              </View>

              {/* Senha */}
              <View style={{ gap: 10 }}>
                <Text style={{
                  color: '#00FF88',
                  fontWeight: '700',
                  fontSize: 16,
                  letterSpacing: 1,
                }}>
                  🗝️ CÓDIGO SECRETO
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: 'rgba(11, 18, 32, 0.8)',
                    borderWidth: 2,
                    borderColor: passwordError ? "#FF4444" : 'rgba(0, 255, 136, 0.3)',
                    borderRadius: 15,
                    paddingRight: 8,
                    shadowColor: passwordError ? "#FF4444" : '#00FF88',
                  }}
                >
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    style={{
                      color: "white",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 16,
                      flex: 1,
                    }}
                    returnKeyType="next"
                  />
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    hitSlop={10}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    }}
                  >
                    <Text style={{
                      color: "#00FF88",
                      fontWeight: "700",
                      fontSize: 12,
                    }}>
                      {showPassword ? "👁️" : "🙈"}
                    </Text>
                  </Pressable>
                </View>
                {!!passwordError && (
                  <Text style={{
                    color: "#FF6B6B",
                    fontSize: 12,
                    marginLeft: 8,
                    fontWeight: '600',
                  }}>
                    ⚠️ {passwordError}
                  </Text>
                )}
              </View>

              {/* Confirmar Senha */}
              <View style={{ gap: 10 }}>
                <Text style={{
                  color: '#00FF88',
                  fontWeight: '700',
                  fontSize: 16,
                  letterSpacing: 1,
                }}>
                  🔒 CONFIRMAR CÓDIGO
                </Text>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repita seu código secreto"
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  style={{
                    backgroundColor: 'rgba(11, 18, 32, 0.8)',
                    borderWidth: 2,
                    borderColor: confirmError ? "#FF4444" : 'rgba(0, 255, 136, 0.3)',
                    color: "white",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 15,
                    fontSize: 16,
                    shadowColor: confirmError ? "#FF4444" : '#00FF88',
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => formValid && handleRegister()}
                />
                {!!confirmError && (
                  <Text style={{
                    color: "#FF6B6B",
                    fontSize: 12,
                    marginLeft: 8,
                    fontWeight: '600',
                  }}>
                    ⚠️ {confirmError}
                  </Text>
                )}
              </View>

              {/* Botão Criar Conta */}
              <Pressable
                onPress={handleRegister}
                disabled={!formValid || loading}
                style={({ pressed }) => ({
                  backgroundColor: !formValid || loading ? "#444" : "#00FF88",
                  paddingVertical: 16,
                  borderRadius: 20,
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: !formValid || loading ? "#666" : "#0099FF",
                  shadowColor: !formValid || loading ? "#000" : "#00FF88",
                  shadowOpacity: 0.5,
                  shadowRadius: 15,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 15,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  marginTop: 8,
                })}
              >
                {loading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator color="#0099FF" />
                    <Text style={{
                      color: "#0099FF",
                      fontWeight: "800",
                      fontSize: 16,
                      letterSpacing: 1,
                    }}>
                      CRIANDO GUERREIRO...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      color: "#000",
                      fontWeight: "800",
                      fontSize: 18,
                      letterSpacing: 1.5,
                    }}
                  >
                    🎮 ENTRAR NA ARENA
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Rodapé */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 24,
                gap: 8,
                paddingBottom: 40,
              }}
            >
              <Text style={{
                color: "#A0A0A0",
                fontSize: 14,
                letterSpacing: 0.5,
              }}>
                Já é um guerreiro?
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={{
                    color: "#00FF88",
                    fontWeight: "700",
                    fontSize: 14,
                    letterSpacing: 0.5,
                  }}>
                    ⚔️ Fazer Login
                  </Text>
                </Pressable>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
