import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="routine" options={{ title: 'Rotina', tabBarIcon: tabIcon('list', 'list-outline') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendário', tabBarIcon: tabIcon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="reports" options={{ title: 'Relatórios', tabBarIcon: tabIcon('bar-chart', 'bar-chart-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: tabIcon('settings', 'settings-outline') }} />
    </Tabs>
  );
}