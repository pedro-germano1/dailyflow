import { Ionicons } from '@expo/vector-icons';
import { eachDayOfInterval, endOfMonth, format, getDay, isSameDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pressable, StyleSheet, View } from 'react-native';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { toISODate } from '@/utils/uiFormat';
import { Card } from './Card';
import { ThemedText } from './ThemedText';

const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']; // semana começa na segunda

interface Props {
  month: Date;
  selected: Date;
  markedDates: Set<string>; // datas 'YYYY-MM-DD' com registros
  onSelect: (date: Date) => void;
  onChangeMonth: (delta: number) => void;
}

export function MonthCalendar({ month, selected, markedDates, onSelect, onChangeMonth }: Props) {
  const { colors } = useTheme();
  const today = new Date();

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const leading = (getDay(startOfMonth(month)) + 6) % 7; // segunda = 0

  const cells: (Date | null)[] = [...Array<null>(leading).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const title = format(month, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={() => onChangeMonth(-1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <ThemedText variant="subheading">{title.charAt(0).toUpperCase() + title.slice(1)}</ThemedText>
        <Pressable onPress={() => onChangeMonth(1)} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((label, index) => (
          <View key={index} style={styles.weekdayCell}>
            <ThemedText variant="caption" secondary>{label}</ThemedText>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((date, dayIndex) => {
            if (!date) return <View key={dayIndex} style={styles.cell} />;

            const isSelected = isSameDay(date, selected);
            const isToday = isSameDay(date, today);
            const marked = markedDates.has(toISODate(date));

            return (
              <View key={dayIndex} style={styles.cell}>
                <Pressable
                  onPress={() => onSelect(date)}
                  style={[
                    styles.day,
                    isSelected && { backgroundColor: colors.primary },
                    !isSelected && isToday && { borderWidth: 1, borderColor: colors.primary },
                  ]}
                >
                  <ThemedText
                    variant="label"
                    style={isSelected ? { color: colors.onPrimary } : undefined}
                  >
                    {date.getDate()}
                  </ThemedText>
                  {marked && (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: isSelected ? colors.onPrimary : colors.primary },
                      ]}
                    />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  week: { flexDirection: 'row' },
  weekdayCell: { width: '14.2857%', alignItems: 'center', paddingBottom: spacing.xs },
  cell: { width: '14.2857%', aspectRatio: 1, padding: 2 },
  day: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 3 },
});