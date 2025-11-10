import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, View } from 'react-native';

interface ChaoticBackgroundProps {
  colors?: readonly [string, string, ...string[]];
  particleCount?: number;
  particleColors?: string[];
  animated?: boolean;
}

const { width, height } = Dimensions.get('window');

export default function ChaoticBackground({
  colors = ['#0f172a', '#1e293b', '#334155'],
  particleCount = 50,
  particleColors = ['#FFD700', '#FF6B6B', '#00FF88', '#0099FF'],
  animated = true,
}: ChaoticBackgroundProps) {
  const particleAnims = useRef(
    Array.from({ length: particleCount }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (!animated) return;

    const animations = particleAnims.map((anim, index) => {
      const createAnimation = () => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000 + Math.random() * 3000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 1000 + Math.random() * 2000,
              useNativeDriver: true,
            }),
          ])
        );
      };

      // Delay inicial aleatório para cada partícula
      return Animated.sequence([
        Animated.delay(Math.random() * 5000),
        createAnimation(),
      ]);
    });

    animations.forEach(animation => animation.start());

    return () => {
      animations.forEach(animation => animation.stop());
    };
  }, [animated, particleAnims]);

  const generateParticles = () => {
    return Array.from({ length: particleCount }, (_, index) => {
      const size = Math.random() * 6 + 2;
      const left = Math.random() * width;
      const top = Math.random() * height;
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      
      return (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            backgroundColor: color,
            borderRadius: size / 2,
            left,
            top,
            shadowColor: color,
            shadowOpacity: 0.8,
            shadowRadius: 8,
            elevation: 8,
            opacity: animated ? particleAnims[index] : 0.6,
            transform: animated ? [
              {
                scale: particleAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.5],
                }),
              },
            ] : [],
          }}
        />
      );
    });
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}>
      {/* Gradiente de fundo */}
      <LinearGradient
        colors={colors}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      {/* Partículas caóticas */}
      <View
        style={{
          position: 'absolute',
          width: width,
          height: height,
        }}
      >
        {generateParticles()}
      </View>

      {/* Overlay removido para evitar transparência indesejada */}
    </View>
  );
}
