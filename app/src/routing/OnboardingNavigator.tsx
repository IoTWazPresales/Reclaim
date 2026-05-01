import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from 'react-native-paper';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/providers/AuthProvider';
import { loadOnboardingStep } from '@/lib/onboardingProgress';
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

interface OnboardingNavigatorProps {
  onFinish: () => void;
}

export default function OnboardingNavigator({ onFinish }: OnboardingNavigatorProps) {
  const reduceMotion = useReducedMotion();
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [initialRoute, setInitialRoute] = useState<keyof OnboardingStackParamList | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const route = await loadOnboardingStep(userId);
      if (!cancelled) setInitialRoute(route);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (initialRoute === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="Loading setup" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Capabilities" component={CapabilitiesScreen} />
      <Stack.Screen name="MoodCheckin" component={MoodCheckinScreen} />
      <Stack.Screen name="Reset" component={ResetScreen} />
      <Stack.Screen name="Meds" component={MedsStepScreen} />
      <Stack.Screen name="Sleep" component={SleepStepScreen} />
      <Stack.Screen name="Finish">
        {() => <FinishScreen onFinish={onFinish} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
