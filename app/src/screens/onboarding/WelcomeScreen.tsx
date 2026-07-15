import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, useTheme, Card, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { completeOnboarding } from './completeOnboarding';
import { useSyncOnboardingRoute } from '@/hooks/useSyncOnboardingRoute';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';
import {
  RECLAIM_SCREEN_HORIZONTAL,
  RECLAIM_SCREEN_TOP_INSET,
} from '@/theme/reclaimScreenLayout';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

const enter = (delay: number) =>
  FadeInUp.delay(delay).duration(500).springify().damping(22).reduceMotion(ReduceMotion.System);

export default function WelcomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  useSyncOnboardingRoute('Welcome');

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: RECLAIM_SCREEN_HORIZONTAL,
        paddingVertical: RECLAIM_SCREEN_TOP_INSET,
        backgroundColor: theme.colors.background,
      }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>

          <Animated.View entering={enter(0)}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '800',
                marginBottom: 14,
                color: theme.colors.onSurface,
                lineHeight: 38,
              }}
            >
              Feel better,{'\n'}one day at a time.
            </Text>
          </Animated.View>

          <Animated.View entering={enter(120)}>
            <Text
              style={{
                opacity: 0.8,
                marginBottom: 28,
                color: theme.colors.onSurfaceVariant,
                lineHeight: 23,
                fontSize: 15,
              }}
            >
              Reclaim connects your mood, sleep, and habits into a daily signal of
              what matters — personalised to you. Your Home starts with that read.
            </Text>
          </Animated.View>

          <Animated.View entering={enter(260)}>
            <Card
              mode="outlined"
              style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}
            >
              <Card.Content>
                <Text
                  variant="labelSmall"
                  style={{
                    color: theme.colors.primary,
                    marginBottom: 8,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}
                >
                  Example insight
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    marginBottom: 6,
                    color: theme.colors.onSurface,
                    fontWeight: '700',
                  }}
                >
                  Short sleep can dampen mood balance.
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Take a 10–20 min sunlight walk.
                </Text>
              </Card.Content>
            </Card>
          </Animated.View>

        </View>
      </ScrollView>

      <Animated.View entering={enter(380)} style={{ paddingTop: 16 }}>
        <Button
          mode="contained"
          onPress={() => navigation.replace('Capabilities')}
          style={{ marginBottom: 12 }}
          contentStyle={{ paddingVertical: 4 }}
          accessibilityLabel="Show me the walkthrough"
        >
          Show me
        </Button>
        <Button
          mode="text"
          onPress={() => {
            Alert.alert(
              'Explore the app first?',
              'You can finish setup anytime from Settings. A short walkthrough helps Reclaim tailor your daily signal.',
              [
                { text: 'Continue setup', style: 'cancel' },
                {
                  text: 'Explore app',
                  onPress: async () => {
                    await completeOnboarding();
                  },
                },
              ],
            );
          }}
          accessibilityLabel="Explore app before finishing setup"
        >
          Explore app first
        </Button>
      </Animated.View>
    </View>
  );
}
