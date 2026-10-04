import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { ThemedText } from '@/components/ThemedText';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

type Period = 'week' | 'month';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>('week');

  return (
    <ScreenPlaceholder
      title="Relatórios"
      subtitle={period === 'week' ? 'Resumo da semana' : 'Resumo do mês'}
    >
      <View style={[styles.segment, { backgroundColor: colors.surfaceMuted }]}>
        {(['week', 'month'] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.option, period === p && { backgroundColor: colors.surface }]}
          >
            <ThemedText variant="label" secondary={period !== p}>
              {p === 'week' ? 'Semana' : 'Mês'}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.xs,
    marginTop: spacing.xl,
  },
  option: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.sm, alignItems: 'center' },
});