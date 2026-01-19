import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';

import Dashboard from '@/screens/Dashboard';
import AnalyticsScreen from '@/screens/AnalyticsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import { useAppTheme } from '@/theme';
import type { TabsParamList } from '@/navigation/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const Tab = createBottomTabNavigator<TabsParamList>();

export default function TabsNavigator() {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();

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
            onPress={() => {
              const parentNav = navigation.getParent();
              if (parentNav) {
                parentNav.dispatch(DrawerActions.toggleDrawer());
                return;
              }
              navigation.dispatch(DrawerActions.toggleDrawer());
            }}
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
        animationEnabled: !reduceMotion,
        animation: reduceMotion ? 'none' : 'fade',
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
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
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ headerTitle: 'Analytics' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ headerTitle: 'Settings' }} />
    </Tab.Navigator>
  );
}
