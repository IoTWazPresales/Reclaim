import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';

import Dashboard from '@/screens/Dashboard';
import SleepScreen from '@/screens/SleepScreen';
import MoodScreen from '@/screens/MoodScreen';
import AnalyticsScreen from '@/screens/AnalyticsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import { useAppTheme } from '@/theme';
import type { TabsParamList } from '@/navigation/types';

const Tab = createBottomTabNavigator<TabsParamList>();

export default function TabsNavigator() {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontSize: 20, fontWeight: '600' },
        headerLeft: () => (
          <IconButton
            icon="menu"
            size={24}
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            accessibilityLabel="Open navigation menu"
            iconColor={theme.colors.onSurface}
            style={{ marginLeft: -4 }}
          />
        ),
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          height: 64,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Sleep':
              iconName = focused ? 'moon' : 'moon-outline';
              break;
            case 'Mood':
              iconName = focused ? 'happy' : 'happy-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Dashboard} options={{ headerTitle: 'Home' }} />
      <Tab.Screen name="Sleep" component={SleepScreen} options={{ headerTitle: 'Sleep' }} />
      <Tab.Screen name="Mood" component={MoodScreen} options={{ headerTitle: 'Mood' }} />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ headerTitle: 'Analytics' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerTitle: 'Settings' }}
      />
    </Tab.Navigator>
  );
}



