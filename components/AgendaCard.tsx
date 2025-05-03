import { Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 32;
const CARD_MARGIN = 8;

type AgendaCardProps = {
  name: string;
  isEditor: boolean;
  isCreator?: boolean;
  onPress: () => void;
  totalInRow: number;
};

export function AgendaCard({ name, isEditor, isCreator, onPress, totalInRow }: AgendaCardProps) {
  const cardWidth = (width - (HORIZONTAL_PADDING * 2) - (CARD_MARGIN * (totalInRow))) / totalInRow;
  
  const nameSize = cardWidth * 0.085;
  const roleSize = cardWidth * 0.065;
  
  const roleText = isCreator ? 'Creator' : isEditor ? 'Editor' : 'Member';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <ThemedView 
        style={[styles.card, { width: cardWidth, height: cardWidth }]}
        lightColor="rgba(0,0,0,0.05)"
        darkColor="rgba(255,255,255,0.05)"
      >
        <ThemedText 
          type="defaultSemiBold" 
          numberOfLines={2} 
          style={[styles.name, { fontSize: Math.min(Math.max(nameSize, 14), 20) }]}
        >
          {name}
        </ThemedText>
        <ThemedText 
          style={[styles.role, { fontSize: Math.min(Math.max(roleSize, 12), 16) }]}
          lightColor="#687076"
          darkColor="#9BA1A6"
        >
          {roleText}
        </ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginRight: CARD_MARGIN,
    marginBottom: CARD_MARGIN,
    justifyContent: 'space-between',
  },
  name: {
    lineHeight: 22,
  },
  role: {
    opacity: 0.8,
  },
});