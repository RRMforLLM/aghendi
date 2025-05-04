import { SubjectPicker } from '@/components/agenda/SubjectPicker';
import { BottomSheet } from '@/components/BottomSheet';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
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

interface EditItemSheetProps {
  isVisible: boolean;
  onClose: () => void;
  agendaId: number;
  item: {
    id: number;
    details: string;
    priority: number;
    deadline: string;
    subject_id: number | null;
  };
  onSuccess?: () => void;
}

export function EditItemSheet({ isVisible, onClose, agendaId, item, onSuccess }: EditItemSheetProps) {
  const [details, setDetails] = useState(item.details);
  const [priority, setPriority] = useState<number>(item.priority);
  const [date, setDate] = useState(new Date(item.deadline + 'T00:00:00'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchSubjects();
      setDetails(item.details);
      setPriority(item.priority);
      setDate(new Date(item.deadline + 'T00:00:00'));
    }
  }, [isVisible, item]);

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
      
      const currentSubject = transformedSubjects.find(s => s.id === item.subject_id);
      setSelectedSubject(currentSubject || null);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleUpdateItem = async () => {
    try {
      setIsSubmitting(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not found');

      const now = new Date().toISOString();
      
      const localDate = new Date(date);
      localDate.setHours(0, 0, 0, 0);
      
      if (!hasChanges()) {
        return;
      }

      const { error } = await supabase
        .from('element')
        .update({
          details,
          priority,
          deadline: localDate.toISOString().split('T')[0],
          subject_id: selectedSubject?.id || null,
          updated_at: now,
        })
        .eq('id', item.id);

      if (error) throw error;

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error updating item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = () => {
    const originalDate = new Date(item.deadline + 'T00:00:00');
    originalDate.setHours(0, 0, 0, 0);
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);

    const subjectChanged = (
      (item.subject_id !== null && selectedSubject === null) ||
      (item.subject_id === null && selectedSubject !== null) ||
      (item.subject_id !== null && selectedSubject?.id !== item.subject_id)
    );

    const detailsChanged = details.trim() !== item.details.trim();
    const priorityChanged = priority !== item.priority;
    const dateChanged = newDate.getTime() !== originalDate.getTime();

    return detailsChanged || priorityChanged || dateChanged || subjectChanged;
  };

  const isValid = () => {
    return details.trim().length > 0;
  };

  const priorityButtons = [
    { title: 'Low', value: 1 },
    { title: 'Medium', value: 2 },
    { title: 'High', value: 3 },
  ];

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.modalTitle}>Edit Item</ThemedText>

      <ThemedView style={styles.inputContainer}>
        <ThemedText style={styles.label}>Subject</ThemedText>
        <SubjectPicker
          subjects={subjects}
          selectedSubject={selectedSubject}
          onSelect={setSelectedSubject}
        />
      </ThemedView>
      
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

      <ThemedView style={styles.modalButtons}>
        <Button
          title="Cancel"
          onPress={onClose}
          type="outline"
          buttonStyle={styles.button}
          containerStyle={styles.buttonContainer}
        />
        <Button
          title="Save Changes"
          onPress={handleUpdateItem}
          disabled={!isValid() || !hasChanges() || isSubmitting}
          loading={isSubmitting}
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