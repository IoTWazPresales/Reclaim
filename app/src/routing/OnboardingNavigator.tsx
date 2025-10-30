import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GoalsScreen from '@/screens/onboarding/GoalsScreen';
import PermissionsScreen from '@/screens/onboarding/PermissionsScreen';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
    </Stack.Navigator>
  );
}
