import React, { useCallback, useEffect } from 'react';
import { BackHandler, Dimensions, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { ThemedView } from './ThemedView';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_HEIGHT = SCREEN_HEIGHT * 0.9;

type Props = {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export const TopSheet: React.FC<Props> = ({ isVisible, onClose, children }) => {
  const translateY = useSharedValue(-SCREEN_HEIGHT);
  
  const scrollTo = useCallback((destination: number) => {
    'worklet';
    translateY.value = withSpring(destination, { 
      damping: 50,
      stiffness: 300,
    });
  }, []);

  const handleClose = useCallback(() => {
    scrollTo(-SCREEN_HEIGHT);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose, scrollTo]);

  useEffect(() => {
    if (isVisible) {
      scrollTo(0);
    }
  }, [isVisible, scrollTo]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isVisible) {
        handleClose();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isVisible, handleClose]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.min(event.nativeEvent.layout.height, MAX_HEIGHT);
    if (!isVisible) {
      translateY.value = -SCREEN_HEIGHT;
    }
  }, [isVisible]);

  const rSheetStyle = useAnimatedStyle(() => {
    const borderRadius = interpolate(
      translateY.value,
      [-SCREEN_HEIGHT, 0],
      [0, 0.5],
      Extrapolate.CLAMP
    );

    return {
      borderRadius,
      transform: [{ translateY: translateY.value }],
      maxHeight: MAX_HEIGHT,
    };
  });

  const rBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateY.value,
        [-SCREEN_HEIGHT, 0],
        [0, 0.5],
        Extrapolate.CLAMP
      ),
    };
  });

  if (!isVisible) return null;

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[styles.backdrop, rBackdropStyle]}>
        <Pressable style={styles.backdropPressable} onPress={handleClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, rSheetStyle]}>
        <View onLayout={onLayout}>
          <ThemedView 
            style={styles.content}
            lightColor="#ffffff"
            darkColor="#151718"
          >
            {children}
          </ThemedView>
        </View>
      </Animated.View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 2000,
    elevation: 2000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 2000,
    elevation: 2000,
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    width: '100%',
    top: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    zIndex: 2001,
    elevation: 2001,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
});