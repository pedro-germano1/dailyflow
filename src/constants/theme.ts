import type { TextStyle } from 'react-native';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  onPrimary: string;
  success: string;
  warning: string;
  danger: string;
}

export const lightColors: ThemeColors = {
  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F5',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  primary: '#4F8EF7',
  onPrimary: '#FFFFFF',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export const darkColors: ThemeColors = {
  background: '#0B0D12',
  surface: '#161A22',
  surfaceMuted: '#1F242E',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  border: '#262B36',
  primary: '#6AA3FF',
  onPrimary: '#0B0D12',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' },
  heading: { fontSize: 20, fontWeight: '600' },
  subheading: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 14, fontWeight: '500' },
  caption: { fontSize: 12, fontWeight: '400' },
  metric: { fontSize: 22, fontWeight: '700' },
} satisfies Record<string, TextStyle>;