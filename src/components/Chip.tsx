import { Pressable, StyleSheet } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from './ThemedText';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <ThemedText variant="label" style={{ color: selected ? colors.onPrimary : colors.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});