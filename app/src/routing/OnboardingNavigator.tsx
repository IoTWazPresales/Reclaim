import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import WelcomeScreen from '@/screens/onboarding/WelcomeScreen';
import CapabilitiesScreen from '@/screens/onboarding/CapabilitiesScreen';
import MoodCheckinScreen from '@/screens/onboarding/MoodCheckinScreen';
import ResetScreen from '@/screens/onboarding/ResetScreen';
import MedsStepScreen from '@/screens/onboarding/MedsStepScreen';
import SleepStepScreen from '@/screens/onboarding/SleepStepScreen';
import FinishScreen from '@/screens/onboarding/FinishScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Capabilities: undefined;
  MoodCheckin: undefined;
  Reset: undefined;
  Meds: undefined;
  Sleep: undefined;
  Finish: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  const reduceMotion = useReducedMotion();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Capabilities" component={CapabilitiesScreen} />
      <Stack.Screen name="MoodCheckin" component={MoodCheckinScreen} />
      <Stack.Screen name="Reset" component={ResetScreen} />
      <Stack.Screen name="Meds" component={MedsStepScreen} />
      <Stack.Screen name="Sleep" component={SleepStepScreen} />
      <Stack.Screen name="Finish" component={FinishScreen} />
    </Stack.Navigator>
  );
}
