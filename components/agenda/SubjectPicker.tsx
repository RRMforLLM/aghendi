import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Button } from '@rneui/themed';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface Subject {
  id: number;
  name: string;
}

interface SubjectPickerProps {
  subjects: Subject[];
  selectedSubject: Subject | null;
  onSelect: (subject: Subject | null) => void;
}

export function SubjectPicker({ subjects, selectedSubject, onSelect }: SubjectPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<View>(null);
  const colorScheme = useColorScheme() ?? 'light';

  const measureButton = () => {
    if (buttonRef.current) {
      buttonRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPosition({
          top: y + height + 4,
          left: x,
          width: width,
        });
      });
    }
  };

  const handleOpen = () => {
    measureButton();
    setIsOpen(true);
  };

  const handleSelect = (subject: Subject | null) => {
    onSelect(subject);
    setIsOpen(false);
  };

  return (
    <>
      <View ref={buttonRef}>
        <Button
          title={selectedSubject?.name || "Select a subject"}
          type="outline"
          onPress={handleOpen}
          buttonStyle={styles.button}
          iconRight
          iconPosition="right"
          icon={
            <IconSymbol 
              name="chevron.right" 
              size={16} 
              color={Colors[colorScheme].icon}
              style={[styles.icon, isOpen && styles.iconOpen]} 
            />
          }
        />
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable 
          style={styles.overlay} 
          onPress={() => setIsOpen(false)}
        >
          <ThemedView
            style={[
              styles.dropdown,
              {
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
              }
            ]}
          >
            <ScrollView 
              style={styles.scrollView}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {selectedSubject && (
                <Pressable
                  onPress={() => handleSelect(null)}
                  style={styles.option}
                >
                  <ThemedText style={styles.clearOption}>
                    Clear selection
                  </ThemedText>
                </Pressable>
              )}

              {subjects.map((subject) => (
                <Pressable
                  key={subject.id}
                  onPress={() => handleSelect(subject)}
                  style={[
                    styles.option,
                    selectedSubject?.id === subject.id && {
                      backgroundColor: colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC'
                    }
                  ]}
                >
                  <ThemedText>{subject.name}</ThemedText>
                </Pressable>
              ))}

              {subjects.length === 0 && (
                <ThemedText style={styles.emptyText}>
                  No subjects available
                </ThemedText>
              )}
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  icon: {
    transform: [{ rotate: '90deg' }],
    marginLeft: 8,
  },
  iconOpen: {
    transform: [{ rotate: '-90deg' }],
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    maxHeight: 200,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  scrollView: {
    maxHeight: 200,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  clearOption: {
    color: '#dc3545',
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
  }
});