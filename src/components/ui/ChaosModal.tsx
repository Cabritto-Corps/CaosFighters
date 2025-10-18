import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';

interface ChaosModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  backdropOpacity?: number;
}

const { width, height } = Dimensions.get('window');

export default function ChaosModal({
  visible,
  onClose,
  children,
  title,
  showCloseButton = true,
  backdropOpacity = 0.8,
}: ChaosModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />
      
      {/* Backdrop */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
          opacity: fadeAnim,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
          ],
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderRadius: 24,
            padding: 24,
            maxWidth: width * 0.85,
            minWidth: width * 0.75,
            maxHeight: height * 0.75,
            borderWidth: 2,
            borderColor: 'rgba(255, 215, 0, 0.3)',
            shadowColor: '#FFD700',
            shadowOpacity: 0.3,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 10 },
            elevation: 20,
          }}
        >
          {/* Efeito de brilho no fundo */}
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'transparent', 'rgba(255, 107, 107, 0.1)']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 22,
            }}
          />

          {/* Header com título e botão fechar */}
          {(title || showCloseButton) && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              {title && (
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#FFD700',
                    letterSpacing: 1,
                    flex: 1,
                  }}
                >
                  {title}
                </Text>
              )}
              
              {showCloseButton && (
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => ({
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: 8,
                    borderRadius: 12,
                    transform: [{ scale: pressed ? 0.9 : 1 }],
                  })}
                >
                  <Text style={{ fontSize: 18, color: '#FF6B6B' }}>✕</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Conteúdo */}
          <View style={{ flex: 1 }}>
            {children}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
