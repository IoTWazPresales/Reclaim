import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GoalsScreen from '@/screens/onboarding/GoalsScreen';
import PermissionsScreen from '@/screens/onboarding/PermissionsScreen';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  const reduceMotion = useReducedMotion();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}>
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
    </Stack.Navigator>
  );
}
