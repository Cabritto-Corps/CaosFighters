import React from 'react';
import { Pressable, Text, TextStyle, ViewStyle } from 'react-native';

interface ChaosButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  animate?: boolean;
}

export default function ChaosButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
  animate = true,
}: ChaosButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? '#444' : '#4f46e5',
          borderColor: disabled ? '#666' : '#FFD700',
          shadowColor: disabled ? '#000' : '#FF6B6B',
        };
      case 'secondary':
        return {
          backgroundColor: disabled ? '#444' : 'rgba(255, 255, 255, 0.1)',
          borderColor: disabled ? '#666' : 'rgba(255, 255, 255, 0.3)',
          shadowColor: disabled ? '#000' : '#94a3b8',
        };
      case 'danger':
        return {
          backgroundColor: disabled ? '#444' : '#dc2626',
          borderColor: disabled ? '#666' : '#FF4444',
          shadowColor: disabled ? '#000' : '#FF6B6B',
        };
      case 'success':
        return {
          backgroundColor: disabled ? '#444' : '#16a34a',
          borderColor: disabled ? '#666' : '#00FF88',
          shadowColor: disabled ? '#000' : '#00FF88',
        };
      default:
        return {
          backgroundColor: disabled ? '#444' : '#4f46e5',
          borderColor: disabled ? '#666' : '#FFD700',
          shadowColor: disabled ? '#000' : '#FF6B6B',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 10,
          paddingHorizontal: 20,
          fontSize: 14,
        };
      case 'medium':
        return {
          paddingVertical: 16,
          paddingHorizontal: 32,
          fontSize: 16,
        };
      case 'large':
        return {
          paddingVertical: 20,
          paddingHorizontal: 40,
          fontSize: 18,
        };
      default:
        return {
          paddingVertical: 16,
          paddingHorizontal: 32,
          fontSize: 16,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: variantStyles.backgroundColor,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: variantStyles.borderColor,
          transform: animate ? [{ scale: pressed ? 0.95 : 1 }] : [],
        },
        style,
      ]}
    >
      <Text
        style={[
          {
            color: disabled ? '#999' : 'white',
            fontSize: sizeStyles.fontSize,
            fontWeight: '700',
            letterSpacing: 1,
            textShadowColor: disabled ? 'transparent' : '#000',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 3,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
