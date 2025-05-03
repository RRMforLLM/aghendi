import { Element } from '@/components/Agenda';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ExpandableText } from '@/components/ui/ExpandableText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Pressable, StyleSheet, View } from 'react-native';

export interface AgendaItemsProps {
  items: Element[];
  isEditor: boolean;
  onRefresh: () => void;
  onEditItem: (item: Element) => void;
}

export function AgendaItems({ items, isEditor, onRefresh, onEditItem }: AgendaItemsProps) {
  const colorScheme = useColorScheme();

  const handleLongPress = (item: Element) => {
    if (!isEditor) return;
    onEditItem(item);
  };

  return (
    <View style={styles.container}>
      {items.map(item => (
        <Pressable
          key={item.id}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
        >
          <ThemedView 
            style={[
              styles.itemContainer,
              { 
                borderLeftColor: getPriorityColor(item.priority),
                backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)'
              }
            ]}
          >
            <View style={styles.itemHeader}>
              {item.subject && (
                <ThemedView 
                  style={[
                    styles.subjectTag,
                    { backgroundColor: getPriorityColor(item.priority, 0.1) }
                  ]}
                >
                  <ThemedText 
                    style={[
                      styles.subjectText,
                      { color: getPriorityColor(item.priority) }
                    ]}
                  >
                    {item.subject.name}
                  </ThemedText>
                </ThemedView>
              )}
              {!item.subject && (
                <ThemedText 
                  style={[
                  styles.subjectText,
                  { color: getPriorityColor(item.priority) }
                 ]}
                >
                  {''}
                </ThemedText>
              )}
              <ThemedText
                style={[
                  styles.deadline,
                  isDateClose(item.deadline) && styles.urgentDeadline
                ]}
              >
                {formatDate(item.deadline)}
              </ThemedText>
            </View>

            <ExpandableText 
              text={item.details}
              style={styles.details}
              numberOfLines={2}
            />
            
            <ThemedText 
              style={[
                styles.priority,
                { color: getPriorityColor(item.priority) }
              ]}
            >
              {getPriorityText(item.priority)} Priority
            </ThemedText>
          </ThemedView>
        </Pressable>
      ))}
    </View>
  );
}

const getPriorityColor = (priority: number, opacity = 1) => {
  switch (priority) {
    case 3:
      return `rgba(220, 53, 69, ${opacity})`;
    case 2:
      return `rgba(255, 193, 7, ${opacity})`;
    default:
      return `rgba(40, 167, 69, ${opacity})`;
  }
};

const getPriorityText = (priority: number) => {
  switch (priority) {
    case 3:
      return 'High';
    case 2:
      return 'Medium';
    default:
      return 'Low';
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date < today) {
    return 'Overdue';
  } else if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString();
  }
};

const isDateClose = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 2;
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    gap: 12,
  },
  itemContainer: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deadline: {
    fontSize: 14,
    opacity: 0.8,
  },
  urgentDeadline: {
    color: '#dc3545',
    fontWeight: '600',
  },
  details: {
    fontSize: 16,
    lineHeight: 22,
  },
  priority: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
});