import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
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
      </Stack>
    </SafeAreaProvider>
  );
}
