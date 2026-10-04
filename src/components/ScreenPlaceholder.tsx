import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from './ThemedText';

interface Props {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function ScreenPlaceholder({ title, subtitle, children }: Props) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.content}>
        <ThemedText variant="title">{title}</ThemedText>
        {subtitle ? <ThemedText secondary style={styles.subtitle}>{subtitle}</ThemedText> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: spacing.xl },
  subtitle: { marginTop: spacing.xs },
});