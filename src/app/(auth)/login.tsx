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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const emailError = useMemo(() => {
    if (!email) return "";
    const ok = /\S+@\S+\.\S+/.test(email.trim());
    return ok ? "" : "Email inválido";
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "";
    return password.length >= 6 ? "" : "Mínimo de 6 caracteres";
  }, [password]);

  const formValid = email && password && !emailError && !passwordError;

  async function handleLogin() {
    try {
      setLoading(true);
      // Simulação de login (troque pela sua API/fetch)
      await new Promise((r) => setTimeout(r, 1200));
      // Exemplo simples: aceita qualquer email e senha >= 6
      router.push("../main"); // Redireciona para a tela principal após login
    } catch (e) {
      Alert.alert("Erro", "Não foi possível entrar. Tente novamente.");
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
        {[...Array(30)].map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              backgroundColor: '#FFD700',
              borderRadius: 10,
              left: Math.random() * width,
              top: Math.random() * 800,
              shadowColor: '#FFD700',
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
              onPress={() => router.push("/")}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 40,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ fontSize: 24, color: '#FFD700', marginRight: 8 }}>←</Text>
              <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '600' }}>
                Voltar à Arena
              </Text>
            </Pressable>

            {/* Título da tela */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <Text style={{
                fontSize: 32,
                fontWeight: '900',
                color: '#FFD700',
                textAlign: 'center',
                letterSpacing: 2,
                textShadowColor: '#FF4444',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 8,
                marginBottom: 8,
              }}>
                ENTRAR
              </Text>
              <Text style={{
                color: '#A0A0A0',
                fontSize: 16,
                textAlign: 'center',
                letterSpacing: 1,
              }}>
                Acesse sua conta de guerreiro
              </Text>
              
              {/* Linha decorativa */}
              <View style={{
                width: 100,
                height: 3,
                backgroundColor: '#FF6B6B',
                borderRadius: 2,
                marginTop: 16,
                shadowColor: '#FF6B6B',
                shadowOpacity: 0.8,
                shadowRadius: 8,
                elevation: 8,
              }} />
            </View>

            {/* Card de login */}
            <View
              style={{
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                borderRadius: 25,
                padding: 24,
                gap: 20,
                borderWidth: 2,
                borderColor: 'rgba(255, 215, 0, 0.3)',
              }}
            >
              {/* Email */}
              <View style={{ gap: 10 }}>
                <Text style={{
                  color: '#FFD700',
                  fontWeight: '700',
                  fontSize: 16,
                  letterSpacing: 1,
                }}>
                  EMAIL
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
                    borderColor: emailError ? "#FF4444" : 'rgba(255, 215, 0, 0.3)',
                    color: "white",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 15,
                    fontSize: 16,
                    shadowColor: emailError ? "#FF4444" : '#FFD700',
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
                  color: '#FFD700',
                  fontWeight: '700',
                  fontSize: 16,
                  letterSpacing: 1,
                }}>
                  SENHA
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: 'rgba(11, 18, 32, 0.8)',
                    borderWidth: 2,
                    borderColor: passwordError ? "#FF4444" : 'rgba(255, 215, 0, 0.3)',
                    borderRadius: 15,
                    paddingRight: 8,
                    shadowColor: passwordError ? "#FF4444" : '#FFD700',
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
                    returnKeyType="done"
                    onSubmitEditing={() => formValid && handleLogin()}
                  />
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    hitSlop={10}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    }}
                  >
                    <Text style={{
                      color: "#FFD700",
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

              {/* Esqueci a senha */}
              <View style={{ alignItems: "flex-end" }}>
                <Pressable
                  onPress={() => Alert.alert("🔮 Recuperação Mística", "Funcionalidade em desenvolvimento!")}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text style={{
                    color: "#93c5fd",
                    fontWeight: '600',
                    letterSpacing: 0.5,
                  }}>
                    Esqueci minha senha
                  </Text>
                </Pressable>
              </View>

              {/* Botão Entrar */}
              <Pressable
                onPress={handleLogin}
                disabled={!formValid || loading}
                style={({ pressed }) => ({
                  backgroundColor: !formValid || loading ? "#444" : "#0F4D0F",
                  paddingVertical: 16,
                  borderRadius: 20,
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: !formValid || loading ? "#666" : "#666",
                  shadowColor: !formValid || loading ? "#000" : "#FF6B6B",
                  shadowOpacity: 0.5,
                  shadowRadius: 15,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 15,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                })}
              >
                {loading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator color="#FFD700" />
                    <Text style={{
                      color: "#FFD700",
                      fontWeight: "800",
                      fontSize: 16,
                      letterSpacing: 1,
                    }}>
                      ENTRANDO...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "800",
                      fontSize: 18,
                      letterSpacing: 1.5,
                      textShadowColor: '#000',
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: 3,
                    }}
                  >
                     ENTRAR NA BATALHA
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
                Novo guerreiro?
              </Text>
              <Link href={"/(auth)/register" as any} asChild>
                <Pressable>
                  <Text style={{
                    color: "#FFD700",
                    fontWeight: "700",
                    fontSize: 14,
                    letterSpacing: 0.5,
                  }}>
                    Criar Conta
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
