import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { ThemedView } from '../ThemedView';

interface LoadingSpinnerProps {
  size?: number;
  style?: ViewStyle;
  showFallback?: boolean;
  fallbackTimeout?: number;
}

export function LoadingSpinner({ 
  size = 36, 
  style,
  showFallback = true,
  fallbackTimeout = 10000,
}: LoadingSpinnerProps) {
  const rotation = useSharedValue(0);
  const colorScheme = useColorScheme() ?? 'light';
  const tintColor = Colors[colorScheme].tint;

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1
    );

    let fallbackTimer: NodeJS.Timeout;
    if (showFallback) {
      fallbackTimer = setTimeout(() => {
        cancelAnimation(rotation);
      }, fallbackTimeout);
    }

    return () => {
      cancelAnimation(rotation);
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
    };
  }, []);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const strokeWidth = size * 0.1;
  const circleRadius = (size * 0.8 - strokeWidth) / 2;

  return (
    <ThemedView style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View style={spinnerStyle}>
        <Svg width={size * 0.8} height={size * 0.8} viewBox={`0 0 ${size * 0.8} ${size * 0.8}`}>
          <Circle
            cx={size * 0.4}
            cy={size * 0.4}
            r={circleRadius}
            stroke={tintColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circleRadius * Math.PI * 0.75} ${circleRadius * Math.PI * 0.25}`}
          />
        </Svg>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});