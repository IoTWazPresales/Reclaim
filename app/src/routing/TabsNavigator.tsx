import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import SettingsScreen from '@/screens/SettingsScreen'; // ← new

import Dashboard from '@/screens/Dashboard';
import MindfulnessScreen from '@/screens/MindfulnessScreen';
import MoodScreen from '@/screens/MoodScreen';
import SleepScreen from '@/screens/SleepScreen';
import AnalyticsScreen from '@/screens/AnalyticsScreen';
import MedsStack from '@/routing/MedsStack';

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#6b7280',
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Meds':
              iconName = focused ? 'medkit' : 'medkit-outline';
              break;
            case 'Mood':
              iconName = focused ? 'happy' : 'happy-outline';
              break;
            case 'Sleep':
              iconName = focused ? 'moon' : 'moon-outline';
              break;
            case 'Mindfulness':
              iconName = focused ? 'leaf' : 'leaf-outline';
              break;
            case 'Insights':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Dashboard} />
      <Tab.Screen name="Insights" component={AnalyticsScreen} />
      {/* Meds tab uses a nested stack so details screens can push */}
      <Tab.Screen name="Meds" component={MedsStack} />
      <Tab.Screen name="Mood" component={MoodScreen} />
      <Tab.Screen name="Sleep" component={SleepScreen} />
      <Tab.Screen name="Mindfulness" component={MindfulnessScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />

    </Tab.Navigator>
  );
}
