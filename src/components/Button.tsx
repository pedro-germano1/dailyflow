import { Pressable, StyleSheet } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from './ThemedText';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onPress, variant = 'primary' }: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: isPrimary ? colors.primary : colors.surfaceMuted },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText variant="label" style={{ color: isPrimary ? colors.onPrimary : colors.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  pressed: { opacity: 0.7 },
});