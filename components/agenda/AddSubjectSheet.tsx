import { BottomSheet } from '@/components/BottomSheet';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabase';
import { Button } from '@rneui/themed';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

interface AddSubjectSheetProps {
  isVisible: boolean;
  onClose: () => void;
  agendaId: number;
  onSuccess?: () => void;
}

export function AddSubjectSheet({ isVisible, onClose, agendaId, onSuccess }: AddSubjectSheetProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a subject name');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not found');
      }

      const { data: subjectData, error: subjectError } = await supabase
        .from('subject')
        .insert([{ 
          name, 
          creator_id: user.id,
          agenda_id: agendaId
        }])
        .select()
        .single();

      if (subjectError) throw subjectError;
      
      const { error: linkError } = await supabase
        .from('editor_subject')
        .insert([{
          subject_id: subjectData.id,
          editor_id: user.id,
          agenda_id: agendaId
        }]);

      if (linkError) throw linkError;

      onSuccess?.();
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create subject');
      console.error('Subject creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <BottomSheet isVisible={isVisible} onClose={handleClose}>
      <ThemedText type="subtitle" style={styles.modalTitle}>Create New Subject</ThemedText>
      
      <ThemedView style={styles.inputContainer}>
        <ThemedText style={styles.label}>Subject Name</ThemedText>
        <ThemedInput
          placeholder="Enter subject name"
          value={name}
          onChangeText={setName}
          autoFocus
          containerStyle={styles.input}
        />
      </ThemedView>

      <ThemedView style={styles.modalButtons}>
        <Button
          title="Cancel"
          onPress={handleClose}
          type="outline"
          buttonStyle={styles.button}
          containerStyle={styles.buttonContainer}
        />
        <Button
          title="Create"
          onPress={handleCreate}
          loading={isLoading}
          disabled={!name.trim()}
          buttonStyle={styles.button}
          containerStyle={styles.buttonContainer}
        />
      </ThemedView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  modalTitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    marginTop: 4,
  },
  label: {
    marginBottom: 4,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  buttonContainer: {
    flex: 1,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
  },
});