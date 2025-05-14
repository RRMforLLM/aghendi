import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React from 'react';
import { ActivityIndicator, StyleSheet, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

export type ButtonType = 'solid' | 'outline' | 'clear';
export type IconPosition = 'left' | 'right';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  type?: ButtonType;
  loading?: boolean;
  disabled?: boolean;
  buttonStyle?: ViewStyle | ViewStyle[];
  titleStyle?: TextStyle | TextStyle[];
  containerStyle?: ViewStyle | ViewStyle[];
  icon?: React.ReactNode;
  iconRight?: boolean;
  iconPosition?: IconPosition;
  iconContainerStyle?: ViewStyle;
  raised?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function Button({
  title,
  onPress,
  type = 'solid',
  loading = false,
  disabled = false,
  buttonStyle,
  titleStyle,
  containerStyle,
  icon,
  iconRight,
  iconPosition = 'left',
  iconContainerStyle,
  raised = false,
  size = 'medium',
}: ButtonProps) {
  const isSolid = type === 'solid';
  const isOutline = type === 'outline';
  const isClear = type === 'clear';

  const getButtonStyles = () => {
    const baseStyles: ViewStyle = {
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.5 : 1,
    };

    // Add size-specific styles
    switch (size) {
      case 'small':
        baseStyles.paddingHorizontal = 12;
        baseStyles.paddingVertical = 6;
        break;
      case 'large':
        baseStyles.paddingHorizontal = 20;
        baseStyles.paddingVertical = 12;
        break;
    }

    // Add raised effect if needed
    if (raised) {
      baseStyles.shadowColor = '#000';
      baseStyles.shadowOffset = {
        width: 0,
        height: 2,
      };
      baseStyles.shadowOpacity = 0.25;
      baseStyles.shadowRadius = 3.84;
      baseStyles.elevation = 5;
    }

    if (isSolid) {
      return {
        ...baseStyles,
        backgroundColor: '#0d6efd',
      };
    }

    if (isOutline) {
      return {
        ...baseStyles,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#0d6efd',
      };
    }

    if (isClear) {
      return {
        ...baseStyles,
        backgroundColor: 'transparent',
        borderWidth: 0,
      };
    }

    return baseStyles;
  };

  const getTitleStyles = () => {
    const baseStyles: TextStyle = {
      fontSize: 16,
      fontWeight: '600',
    };

    // Add size-specific text styles
    switch (size) {
      case 'small':
        baseStyles.fontSize = 14;
        break;
      case 'large':
        baseStyles.fontSize = 18;
        break;
    }

    if (isSolid) {
      return {
        ...baseStyles,
        color: '#ffffff',
      };
    }

    if (isOutline || isClear) {
      return {
        ...baseStyles,
        color: '#0d6efd',
      };
    }

    return baseStyles;
  };

  const shouldShowIconOnRight = iconRight || iconPosition === 'right';

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[getButtonStyles(), buttonStyle]}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color={isSolid ? '#ffffff' : '#0d6efd'} />
        ) : (
          <>
            {!shouldShowIconOnRight && icon && (
              <View style={[styles.iconContainer, iconContainerStyle]}>
                {icon}
              </View>
            )}
            {title && (
              <ThemedText style={[getTitleStyles(), titleStyle]}>
                {title}
              </ThemedText>
            )}
            {shouldShowIconOnRight && icon && (
              <View style={[styles.iconContainer, iconContainerStyle]}>
                {icon}
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  iconContainer: {
    marginHorizontal: 4,
  },
}); 