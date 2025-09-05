import React, { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import MusicManager from '../../utils/MusicManager';
import ChaosModal from './ChaosModal';

interface ConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ConfigModal({ visible, onClose }: ConfigModalProps) {
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicStatus, setMusicStatus] = useState(MusicManager.getInstance().getStatus());

  useEffect(() => {
    if (visible) {
      setMusicStatus(MusicManager.getInstance().getStatus());
    }
  }, [visible]);

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
            Desenvolvido com ❤️ e ⚡
          </Text>
        </View>
      </View>
    </ChaosModal>
  );
}
