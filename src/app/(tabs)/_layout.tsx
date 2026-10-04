import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F8EF7', // cor provisória, o tema vem na próxima etapa
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