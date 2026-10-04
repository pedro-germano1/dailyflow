import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import type { ActivityStatus } from '@/types/activity';
import { Card } from './Card';
import { ThemedText } from './ThemedText';

interface Props {
  title: string;
  startTime: string;
  endTime: string;
  durationText: string; // ex.: "1h 30min" (use formatDuration)
  categoryIcon: string; // emoji
  categoryColor: string; // hex de 6 dígitos, ex.: '#4F8EF7'
  status: ActivityStatus;
  onPress?: () => void;
  onToggleComplete?: () => void;
}

const statusIcon = {
  completed: 'checkmark-circle',
  skipped: 'close-circle-outline',
  pending: 'ellipse-outline',
} as const;

export function ActivityItem({
  title,
  startTime,
  endTime,
  durationText,
  categoryIcon,
  categoryColor,
  status,
  onPress,
  onToggleComplete,
}: Props) {
  const { colors } = useTheme();
  const done = status === 'completed';

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        {/* "22" no fim do hex = fundo com ~13% de opacidade */}
        <View style={[styles.iconBox, { backgroundColor: `${categoryColor}22` }]}>
          <ThemedText style={styles.emoji}>{categoryIcon}</ThemedText>
        </View>

        <View style={styles.info}>
          <ThemedText
            variant="subheading"
            numberOfLines={1}
            style={done && styles.strike}
            secondary={done}
          >
            {title}
          </ThemedText>
          <ThemedText variant="caption" secondary>
            {startTime} – {endTime} · {durationText}
            {status === 'skipped' ? ' · Pulada' : ''}
          </ThemedText>
        </View>

        <Pressable onPress={onToggleComplete} hitSlop={10}>
          <Ionicons
            name={statusIcon[status]}
            size={28}
            color={done ? colors.success : colors.textSecondary}
          />
        </Pressable>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  info: { flex: 1, gap: 2 },
  strike: { textDecorationLine: 'line-through' },
});