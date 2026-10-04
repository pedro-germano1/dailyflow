import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from './ThemedText';

interface Props {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
}

export function DateTimeField({ label, value, mode, onChange }: Props) {
  const { colors, isDark } = useTheme();
  const [showAndroid, setShowAndroid] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowAndroid(false);
    if (event.type === 'set' && selected) onChange(selected);
  };

  const text = mode === 'time' ? format(value, 'HH:mm') : format(value, 'dd/MM/yyyy');

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <ThemedText variant="label">{label}</ThemedText>

      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          locale="pt-BR"
          themeVariant={isDark ? 'dark' : 'light'}
          onChange={handleChange}
        />
      ) : (
        <>
          <Pressable onPress={() => setShowAndroid(true)} hitSlop={8}>
            <ThemedText variant="subheading" style={{ color: colors.primary }}>{text}</ThemedText>
          </Pressable>
          {showAndroid && (
            <DateTimePicker value={value} mode={mode} is24Hour onChange={handleChange} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
});