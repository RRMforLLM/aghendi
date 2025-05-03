import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { ThemedView } from './ThemedView';

export type ThemedInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
  containerStyle?: any;
};

export function ThemedInput({ 
  style,
  lightColor,
  darkColor,
  containerStyle,
  ...otherProps
}: ThemedInputProps) {
  const colorScheme = useColorScheme();
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const placeholderColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const containerBackground = colorScheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)';

  return (
    <ThemedView style={[styles.inputContainer, { backgroundColor: containerBackground }, containerStyle]}>
      <TextInput 
        style={[
          styles.input,
          { color },
          style
        ]}
        placeholderTextColor={`${placeholderColor}80`} // 80 adds 50% opacity
        {...otherProps}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    borderRadius: 8,
    padding: 12,
  },
  input: {
    height: 40,
    width: '100%',
    fontSize: 16,
    backgroundColor: 'transparent',
  },
});