import React, { useEffect, useState } from 'react';
import { Switch, Text, View, Alert } from 'react-native';
import Constants from 'expo-constants';
import MusicManager from '../../utils/MusicManager';
import ChaosModal from './ChaosModal';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/api';
import { proximityNotificationService } from '../../services/proximityNotifications';

interface ConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ConfigModal({ visible, onClose }: ConfigModalProps) {
  const { user, isAuthenticated, refreshUserProfile } = useAuth();
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicStatus, setMusicStatus] = useState(MusicManager.getInstance().getStatus());
  const [proximityNotificationsEnabled, setProximityNotificationsEnabled] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  useEffect(() => {
    if (visible) {
      setMusicStatus(MusicManager.getInstance().getStatus());
      // Load notification preferences
      if (isAuthenticated && user) {
        setProximityNotificationsEnabled(user.proximity_notifications_enabled ?? false);
      }
    }
  }, [visible, isAuthenticated, user]);

  const handleMusicToggle = async (value: boolean) => {
    const musicManager = MusicManager.getInstance();
    if (value) {
      // Se está ligando a música, desmuta
      if (musicStatus.isMuted) {
        await musicManager.toggleMute();
      }
    } else {
      // Se está desligando a música, muta
      if (!musicStatus.isMuted) {
        await musicManager.toggleMute();
      }
    }
    const newStatus = musicManager.getStatus();
    setMusicStatus(newStatus);
    setMusicEnabled(!newStatus.isMuted);
  };

  const handleSoundToggle = (value: boolean) => {
    setSoundEnabled(value);
    // Aqui você pode implementar a lógica para efeitos sonoros
    // Por exemplo, salvar no AsyncStorage
  };

  const handleProximityNotificationsToggle = async (value: boolean) => {
    if (!isAuthenticated || !user) {
      Alert.alert('Erro', 'Você precisa estar logado para alterar as configurações de notificação');
      return;
    }

    setIsUpdatingNotifications(true);
    try {
      if (value && Constants.appOwnership === 'expo') {
        Alert.alert(
          'Limitação do Expo Go',
          'Notificações push não funcionam no Expo Go. Gere um build de desenvolvimento (expo run:android / expo run:ios) ou use o Expo Dev Client para testar.'
        );
      }

      // Update preference on backend
      await apiService.updateNotificationPreferences({
        proximity_notifications_enabled: value,
      });

      // Update local state
      setProximityNotificationsEnabled(value);

      // Refresh user profile to get updated preferences
      await refreshUserProfile();

      if (value) {
        // Start location tracking
        const started = await proximityNotificationService.startTracking(user.id);
        if (!started) {
          Alert.alert(
            'Permissão Necessária',
            'É necessário permitir acesso à localização para usar notificações de proximidade.'
          );
          setProximityNotificationsEnabled(false);
          await apiService.updateNotificationPreferences({
            proximity_notifications_enabled: false,
          });
        }
      } else {
        // Stop location tracking
        proximityNotificationService.stopTracking();
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      Alert.alert('Erro', 'Não foi possível atualizar as preferências de notificação');
      setProximityNotificationsEnabled(!value);
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  return (
    <ChaosModal
      visible={visible}
      onClose={onClose}
      title="CONFIGURAÇÕES"
      showCloseButton={true}
    >
      <View style={{ gap: 24 }}>
        {/* Configurações de Áudio */}
        <View style={{ gap: 16 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#FFD700',
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            ÁUDIO
          </Text>

          {/* Música de Fundo */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255, 215, 0, 0.2)',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: '#ffffff',
                fontSize: 16,
                fontWeight: '600',
                marginBottom: 4,
              }}>
                Música de Fundo
              </Text>
              <Text style={{
                color: '#94a3b8',
                fontSize: 12,
              }}>
                {musicStatus.isMuted ? 'Desativada' : 'Ativada'}
              </Text>
            </View>
            <Switch
              value={!musicStatus.isMuted}
              onValueChange={handleMusicToggle}
              trackColor={{ 
                false: '#374151', 
                true: 'rgba(255, 215, 0, 0.3)' 
              }}
              thumbColor={!musicStatus.isMuted ? '#FFD700' : '#9ca3af'}
              ios_backgroundColor="#374151"
            />
          </View>

          {/* Efeitos Sonoros */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255, 215, 0, 0.2)',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: '#ffffff',
                fontSize: 16,
                fontWeight: '600',
                marginBottom: 4,
              }}>
                Efeitos Sonoros
              </Text>
              <Text style={{
                color: '#94a3b8',
                fontSize: 12,
              }}>
                Sons de batalha e interface
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ 
                false: '#374151', 
                true: 'rgba(255, 215, 0, 0.3)' 
              }}
              thumbColor={soundEnabled ? '#FFD700' : '#9ca3af'}
              ios_backgroundColor="#374151"
            />
          </View>
        </View>

        {/* Configurações de Notificações */}
        {isAuthenticated && (
          <View style={{ gap: 16 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#FFD700',
              letterSpacing: 1,
              marginBottom: 8,
            }}>
              NOTIFICAÇÕES
            </Text>

            {/* Notificações de Proximidade */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(255, 215, 0, 0.2)',
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: '600',
                  marginBottom: 4,
                }}>
                  Permitir Notificações
                </Text>
                <Text style={{
                  color: '#94a3b8',
                  fontSize: 12,
                }}>
                  Receba notificações quando houver jogadores próximos (até 1km)
                </Text>
              </View>
              <Switch
                value={proximityNotificationsEnabled}
                onValueChange={handleProximityNotificationsToggle}
                disabled={isUpdatingNotifications}
                trackColor={{ 
                  false: '#374151', 
                  true: 'rgba(255, 215, 0, 0.3)' 
                }}
                thumbColor={proximityNotificationsEnabled ? '#FFD700' : '#9ca3af'}
                ios_backgroundColor="#374151"
              />
            </View>
          </View>
        )}

        {/* Info do Jogo */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          marginTop: 16,
        }}>
          <Text style={{
            color: '#64748b',
            fontSize: 12,
            textAlign: 'center',
            lineHeight: 16,
          }}>
            🎮 Caos Fighters v1.0{'\n'}
            Desenvolvido pela Cabritto Corps.
          </Text>
        </View>
      </View>
    </ChaosModal>
  );
}
