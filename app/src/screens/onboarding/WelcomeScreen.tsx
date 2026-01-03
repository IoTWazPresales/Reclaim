import React from 'react';
import { View, Text } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { completeOnboarding } from './completeOnboarding';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 12, color: theme.colors.onSurface }}>
        Feel better, one day at a time.
      </Text>
      <Text style={{ opacity: 0.8, marginBottom: 24, color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>
        Reclaim turns mood, sleep, and routines into gentle daily guidance.
      </Text>

      <Button
        mode="contained"
        onPress={() => navigation.replace('Capabilities')}
        style={{ marginBottom: 12 }}
        accessibilityLabel="Show me the walkthrough"
      >
        Show me
      </Button>
      <Button
        mode="text"
        onPress={async () => {
          await completeOnboarding();
        }}
        accessibilityLabel="Skip onboarding"
      >
        Skip
      </Button>
    </View>
  );
}
