// C:\Reclaim\app\src\routing\TabsNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from '@/screens/Dashboard';
import MedsScreen from '@/screens/MedsScreen';
import MindfulnessScreen from '@/screens/MindfulnessScreen';

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={Dashboard} />
      <Tab.Screen name="Meds" component={MedsScreen} />
      <Tab.Screen name="Mindfulness" component={MindfulnessScreen} />
    </Tab.Navigator>
  );
}
