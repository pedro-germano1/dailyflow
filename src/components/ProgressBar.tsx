import { StyleSheet, View } from 'react-native';
import { radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

export function ProgressBar({ percent }: { percent: number }) {
  const { colors } = useTheme();
  const value = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.fill, { width: `${value}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});