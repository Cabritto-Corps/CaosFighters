import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MusicManager from '../utils/MusicManager';

export default function RootLayout() {
  useEffect(() => {
    // Inicializar sistema de música global
    const initializeGlobalMusic = async () => {
      try {
        console.log('Inicializando música global...');
        const musicManager = MusicManager.getInstance();
        // Carregar e tocar imediatamente (autoPlay = true)
        await musicManager.loadMusic(require('../../assets/sounds/musicadefundo.mp3'), true);
        console.log('Música global iniciada com sucesso');
      } catch (error) {
        console.warn('Erro ao inicializar música global:', error);
      }
    };

    initializeGlobalMusic();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" backgroundColor="#1a1a2e" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1a1a2e' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Caos Fighters',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(auth)/login"
          options={{
            title: 'Entrar na Arena',
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="(auth)/register"
          options={{
            title: 'Novo Guerreiro',
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="main"
          options={{
            title: 'Arena Principal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: 'Perfil do Guerreiro',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="battle"
          options={{
            title: 'Campo de Batalha',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ranking"
          options={{
            title: 'Ranking',
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
