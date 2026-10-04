import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from './ThemedText';

interface Props {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, actionLabel, onActionPress }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <ThemedText variant="heading">{title}</ThemedText>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <ThemedText variant="label" style={{ color: colors.primary }}>{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});