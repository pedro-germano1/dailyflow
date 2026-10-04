import { StyleSheet, View } from 'react-native';
import { spacing } from '@/constants/theme';
import { Button } from './Button';
import { ThemedText } from './ThemedText';

interface Props {
  icon: string; // emoji
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.icon}>{icon}</ThemedText>
      <ThemedText variant="subheading">{title}</ThemedText>
      {message ? <ThemedText secondary style={styles.message}>{message}</ThemedText> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  icon: { fontSize: 40 },
  message: { textAlign: 'center' },
});