import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Button, ProgressBar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Reset'>;

const CUES = [
  { start: 0, end: 10, text: 'Inhale through your nose… and top it up with a second small inhale.' },
  { start: 10, end: 20, text: 'Long, slow exhale through the mouth.' },
  { start: 20, end: 30, text: 'Inhale… small top-up inhale. Easy pace.' },
  { start: 30, end: 40, text: 'Slow exhale. No rush.' },
  { start: 40, end: 50, text: 'Last cycle. Inhale and a small second sip.' },
  { start: 50, end: 55, text: 'Long exhale. Let the shoulders drop.' },
  { start: 55, end: 60, text: 'Notice one thing you feel in your body. That’s enough.' },
];

export default function ResetScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const reduceMotion = useReducedMotion();
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [running, setRunning] = useState(false);

  const currentCue = CUES.find((c) => 60 - secondsLeft >= c.start && 60 - secondsLeft < c.end) ?? CUES[CUES.length - 1];

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      navigation.replace('Meds');
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [running, secondsLeft, navigation]);

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>
        Take 60 seconds to reset
      </Text>
      <Text style={{ opacity: 0.8, marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
        No streaks. No pressure. Just a quick guided moment to help your nervous system settle.
      </Text>
      <Text style={{ opacity: 0.7, marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
        You can do this anytime from Mindfulness.
      </Text>
      <Text style={{ opacity: 0.6, marginBottom: 16, color: theme.colors.onSurfaceVariant }}>60 seconds. Guided.</Text>

      <View style={{ padding: 16, borderRadius: 12, backgroundColor: theme.colors.surface }}>
        <Text style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 8 }}>
          {running ? currentCue.text : 'Ready when you are.'}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          {running ? `${secondsLeft}s left` : '60 seconds total'}
        </Text>
        {!reduceMotion ? (
          <ProgressBar progress={running ? (60 - secondsLeft) / 60 : 0} color={theme.colors.primary} />
        ) : null}
      </View>

      <Button
        mode="contained"
        onPress={() => {
          if (!running) {
            setRunning(true);
            setSecondsLeft(60);
          }
        }}
        disabled={running}
        style={{ marginTop: 20, marginBottom: 12 }}
      >
        Start 60-second reset
      </Button>
      <Button mode="text" onPress={() => navigation.replace('Meds')}>
        Not now
      </Button>
    </View>
  );
}


