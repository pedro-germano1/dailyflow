import { StyleSheet, View } from 'react-native';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { StatCard } from '@/components/StatCard';
import { spacing } from '@/constants/theme';

const preview = [
  { icon: '😴', label: 'Sono', value: '7h 42min' },
  { icon: '💼', label: 'Trabalho', value: '8h 05min' },
  { icon: '📚', label: 'Estudo', value: '2h 10min' },
  { icon: '✅', label: 'Atividades', value: '8/10' },
];

export default function HomeScreen() {
  return (
    <ScreenPlaceholder title="Início" subtitle="Dashboard do dia">
      <View style={styles.grid}>
        {preview.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </View>
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
});