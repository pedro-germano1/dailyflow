import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

type Period = 'week' | 'month';

export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('week');

  return (
    <ScreenPlaceholder
      title="Relatórios"
      subtitle={period === 'week' ? 'Resumo da semana' : 'Resumo do mês'}
    >
      <View style={styles.segment}>
        {(['week', 'month'] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.option, period === p && styles.optionActive]}
          >
            <Text style={[styles.label, period === p && styles.labelActive]}>
              {p === 'week' ? 'Semana' : 'Mês'}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
  },
  option: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  optionActive: { backgroundColor: '#fff' },
  label: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  labelActive: { color: '#111827', fontWeight: '600' },
});