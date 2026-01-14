import React from 'react';
import { View, ScrollView } from 'react-native';
import { Button, useTheme, Card, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { completeOnboarding } from './completeOnboarding';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 12, color: theme.colors.onSurface }}>
            Feel better, one day at a time.
          </Text>
          <Text style={{ opacity: 0.8, marginBottom: 24, color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>
            Reclaim turns mood, sleep, and routines into gentle daily guidance.
          </Text>

          <Card mode="outlined" style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ marginBottom: 8, color: theme.colors.onSurface, fontWeight: '600' }}>
                Short sleep can dampen mood balance.
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Take a 10–20 min sunlight walk.
              </Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      <View style={{ paddingTop: 16 }}>
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
            console.log('[ONBOARD] Skip pressed');
            await completeOnboarding();
          }}
          accessibilityLabel="Skip onboarding"
        >
          Skip
        </Button>
      </View>
    </View>
  );
}
