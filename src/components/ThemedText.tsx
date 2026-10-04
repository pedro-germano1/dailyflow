import { Text, type TextProps } from 'react-native';
import { typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface Props extends TextProps {
  variant?: keyof typeof typography;
  secondary?: boolean;
}

export function ThemedText({ variant = 'body', secondary = false, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <Text
      style={[typography[variant], { color: secondary ? colors.textSecondary : colors.text }, style]}
      {...rest}
    />
  );
}