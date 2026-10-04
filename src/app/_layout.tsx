import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ServicesProvider } from '@/contexts/ServicesContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

function RootNavigator() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="activity-form" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ServicesProvider>
        <RootNavigator />
      </ServicesProvider>
    </ThemeProvider>
  );
}