import { BottomSheet } from '@/components/BottomSheet';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SubjectPicker } from '@/components/agenda/SubjectPicker';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

interface Subject {
  id: number;
  name: string;
}

type SubjectResponse = {
  subject: {
    id: number;
    name: string;
  };
}

interface AddItemSheetProps {
  isVisible: boolean;
  onClose: () => void;
  agendaId: number;
  onSuccess?: () => void;
}

export function AddItemSheet({ isVisible, onClose, agendaId, onSuccess }: AddItemSheetProps) {
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (isVisible) {
      fetchSubjects();
    }
  }, [isVisible]);

  const fetchSubjects = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not found');

      const { data, error: subjectsError } = await supabase
        .from('editor_subject')
        .select(`
          subject:subject_id (
            id,
            name
          )
        `)
        .eq('editor_id', user.id)
        .eq('agenda_id', agendaId) as { data: SubjectResponse[] | null, error: any };

      if (subjectsError) throw subjectsError;
      
      const transformedSubjects = (data || []).map((item: SubjectResponse) => ({
        id: item.subject.id,
        name: item.subject.name
      }));
      
      setSubjects(transformedSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };
  
  React.useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      setDate(today);
    }
  }, []);

  const handleCreateItem = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not found');
      }

      const now = new Date().toISOString();
      
      const localDate = new Date(date);
      localDate.setHours(0, 0, 0, 0);
      
      const { error } = await supabase.from('element').insert({
        details,
        priority,
        deadline: localDate.toISOString().split('T')[0],
        agenda_id: agendaId,
        creator_id: user.id,
        subject_id: selectedSubject?.id || null,
        updated_at: now,
      });

      if (error) throw error;

      onSuccess?.();
      onClose();
      setDetails('');
      setPriority(1);
      setDate(new Date());
      setSelectedSubject(null);
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const priorityButtons = [
    { title: 'Low', value: 1 },
    { title: 'Medium', value: 2 },
    { title: 'High', value: 3 },
  ];

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.modalTitle}>Add New Item</ThemedText>

      <ThemedView style={styles.inputContainer}>
        <ThemedText style={styles.label}>Subject</ThemedText>
        <SubjectPicker
          subjects={subjects}
          selectedSubject={selectedSubject}
          onSelect={setSelectedSubject}
        />
      </ThemedView>

      <ThemedView style={styles.inputContainer}>
        <ThemedText style={styles.label}>Priority</ThemedText>
        <ThemedView style={styles.priorityButtons}>
          {priorityButtons.map((btn) => (
            <Button
              key={btn.value}
              title={btn.title}
              type={priority === btn.value ? 'solid' : 'outline'}
              onPress={() => setPriority(btn.value)}
              containerStyle={styles.priorityButton}
              buttonStyle={styles.button}
            />
          ))}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.inputContainer}>
        <ThemedText style={styles.label}>Deadline</ThemedText>
        <Button
          title={date.toLocaleDateString()}
          type="outline"
          onPress={() => setShowDatePicker(true)}
          buttonStyle={styles.button}
          containerStyle={styles.dateButton}
        />
      </ThemedView>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'default' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (selectedDate >= today) {
                setDate(selectedDate);
              }
            }
          }}
          minimumDate={new Date()}
        />
      )}

      <ThemedView style={styles.inputContainer}>
        <ThemedText style={styles.label}>Details</ThemedText>
        <ThemedInput
          value={details}
          onChangeText={setDetails}
          placeholder="Enter item details"
          autoCapitalize="none"
          multiline
          containerStyle={styles.input}
        />
      </ThemedView>

      <ThemedView style={styles.modalButtons}>
        <Button
          title="Cancel"
          onPress={() => {
            onClose();
            setDetails('');
            setPriority(1);
            setDate(new Date());
          }}
          type="outline"
          buttonStyle={styles.button}
          containerStyle={styles.buttonContainer}
        />
        <Button
          title="Create"
          onPress={handleCreateItem}
          disabled={!details}
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
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  priorityButton: {
    flex: 1,
  },
  dateButton: {
    marginTop: 4,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  buttonContainer: {
    flex: 1,
  }
});