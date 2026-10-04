import { StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';
import { Card } from './Card';
import { ThemedText } from './ThemedText';

interface Props {
  icon: string; // emoji
  label: string;
  value: string;
}

export function StatCard({ icon, label, value }: Props) {
  return (
    <Card style={styles.card}>
      <ThemedText style={styles.icon}>{icon}</ThemedText>
      <ThemedText variant="caption" secondary>{label}</ThemedText>
      <ThemedText variant="metric">{value}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: '45%', flexGrow: 1, gap: spacing.xs },
  icon: { fontSize: 22 },
});