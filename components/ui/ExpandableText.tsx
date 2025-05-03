import { ThemedText } from '@/components/ThemedText';
import React, { useCallback, useState } from 'react';
import { NativeSyntheticEvent, Platform, Pressable, StyleSheet, TextLayoutEventData } from 'react-native';

interface ExpandableTextProps {
  text: string;
  style?: any;
  numberOfLines?: number;
}

export function ExpandableText({ text, style, numberOfLines = 1 }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const [measured, setMeasured] = useState(false);

  const onTextLayout = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (measured) return;

    const linesExceedLimit = e.nativeEvent.lines.length > numberOfLines;
    setNeedsToggle(linesExceedLimit);
    setMeasured(true);
  }, [numberOfLines, measured]);

  const toggleExpanded = useCallback(() => {
    if (!needsToggle) return;
    setIsExpanded(prev => !prev);
  }, [needsToggle]);

  if (Platform.OS === 'ios') {
    return (
      <Pressable onPress={toggleExpanded} disabled={!needsToggle}>
        <ThemedText
          numberOfLines={isExpanded ? undefined : numberOfLines}
          style={[styles.text, style]}
          onTextLayout={onTextLayout}
        >
          {text}
        </ThemedText>
        {!measured && (
          <ThemedText
            style={[styles.text, style, styles.measurementText]}
            onTextLayout={onTextLayout}
          >
            {text}
          </ThemedText>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={toggleExpanded} disabled={!needsToggle}>
      <ThemedText
        numberOfLines={isExpanded ? undefined : numberOfLines}
        style={[styles.text, style]}
        onTextLayout={onTextLayout}
      >
        {text}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  measurementText: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
  },
});