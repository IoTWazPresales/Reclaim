import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Button, useTheme, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSyncOnboardingRoute } from '@/hooks/useSyncOnboardingRoute';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  FadeInUp,
  ReduceMotion,
} from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Reset'>;

const CUES = [
  { start: 0,  end: 10, text: 'Inhale through your nose… top it up with a second small inhale.', phase: 'Inhale' },
  { start: 10, end: 20, text: 'Long, slow exhale through the mouth.',                            phase: 'Exhale' },
  { start: 20, end: 30, text: 'Inhale… small top-up inhale. Easy pace.',                         phase: 'Inhale' },
  { start: 30, end: 40, text: 'Slow exhale. No rush.',                                           phase: 'Exhale' },
  { start: 40, end: 50, text: 'Last cycle. Inhale and a small second sip.',                      phase: 'Inhale' },
  { start: 50, end: 55, text: 'Long exhale. Let the shoulders drop.',                            phase: 'Exhale' },
  { start: 55, end: 60, text: 'Notice one thing you feel in your body. That\'s enough.',         phase: 'Rest'   },
] as const;

const enter = (delay: number) =>
  FadeInUp.delay(delay).duration(450).springify().damping(22).reduceMotion(ReduceMotion.System);

export default function ResetScreen() {
  const theme    = useTheme();
  const nav      = useNavigation<Nav>();
  const reduced  = useReducedMotion();
  useSyncOnboardingRoute('Reset');

  const [secondsLeft, setSecondsLeft] = useState(60);
  const [running, setRunning]         = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const elapsed    = sessionComplete ? 60 : 60 - secondsLeft;
  const currentCue = CUES.find(c => elapsed >= c.start && elapsed < c.end) ?? CUES[CUES.length - 1];

  // ── countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || sessionComplete) return;
    if (secondsLeft <= 0) {
      setRunning(false);
      setSessionComplete(true);
      return;
    }
    const id = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [running, secondsLeft, sessionComplete]);

  // ── breathing circle animation ─────────────────────────────────────────────
  const breathScale = useSharedValue(0.88);
  const ringOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (reduced) {
      breathScale.value = withSpring(1);
      ringOpacity.value = withSpring(0.4);
      return;
    }

    if (running) {
      // Slow pulse matching inhale/exhale (~4 s each half-cycle)
      breathScale.value = withRepeat(
        withTiming(1.18, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
      ringOpacity.value = withRepeat(
        withTiming(0.7, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      // Gentle ambient idle pulse
      breathScale.value = withRepeat(
        withTiming(1.06, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
      ringOpacity.value = withRepeat(
        withTiming(0.55, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
  }, [running, reduced, breathScale, ringOpacity]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const phaseColor =
    currentCue.phase === 'Inhale' ? theme.colors.primary
    : currentCue.phase === 'Exhale' ? theme.colors.secondary
    : theme.colors.tertiary ?? theme.colors.secondary;

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
      <TouchableOpacity
        onPress={() => nav.goBack()}
        style={{ marginBottom: 16, alignSelf: 'flex-start' }}
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>

          <Animated.View entering={enter(0)}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                marginBottom: 8,
                color: theme.colors.onSurface,
              }}
            >
              Take 60 seconds to reset
            </Text>
          </Animated.View>

          <Animated.View entering={enter(100)}>
            <Text
              style={{
                opacity: 0.8,
                marginBottom: 6,
                color: theme.colors.onSurfaceVariant,
                lineHeight: 22,
              }}
            >
              No streaks. No pressure. Just a quick guided moment to help your
              nervous system settle.
            </Text>
            <Text
              style={{ opacity: 0.55, marginBottom: 28, color: theme.colors.onSurfaceVariant }}
            >
              You can do this anytime from Mindfulness.
            </Text>
          </Animated.View>

          {/* Animated breathing circle */}
          <Animated.View entering={enter(200)} style={{ alignItems: 'center', marginBottom: 28 }}>
            {/* Outer glow ring */}
            <Animated.View
              style={[
                ringStyle,
                {
                  position: 'absolute',
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                },
              ]}
            />
            {/* Pulsing filled circle */}
            <Animated.View style={circleStyle}>
              <View
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  backgroundColor: theme.colors.primaryContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: theme.colors.primary,
                  shadowOpacity: 0.35,
                  shadowRadius: 20,
                  elevation: 8,
                }}
              >
                {sessionComplete ? (
                  <>
                    <MaterialCommunityIcons
                      name="check-bold"
                      size={36}
                      color={theme.colors.primary}
                      style={{ marginBottom: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: theme.colors.onPrimaryContainer,
                        textAlign: 'center',
                        paddingHorizontal: 12,
                      }}
                    >
                      Nice work — that&apos;s enough for now.
                    </Text>
                  </>
                ) : running ? (
                  <>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: phaseColor,
                        marginBottom: 4,
                        letterSpacing: 0.5,
                      }}
                    >
                      {currentCue.phase}
                    </Text>
                    <Text
                      style={{
                        fontSize: 44,
                        fontWeight: '800',
                        color: theme.colors.onPrimaryContainer,
                        lineHeight: 48,
                      }}
                    >
                      {secondsLeft}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: theme.colors.onPrimaryContainer,
                        opacity: 0.6,
                        marginTop: 2,
                      }}
                    >
                      seconds left
                    </Text>
                  </>
                ) : (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: theme.colors.onPrimaryContainer,
                      opacity: 0.8,
                      textAlign: 'center',
                      paddingHorizontal: 16,
                    }}
                  >
                    Ready when{'\n'}you are
                  </Text>
                )}
              </View>
            </Animated.View>
          </Animated.View>

          {/* Cue text card */}
          <Animated.View entering={enter(300)}>
            <View
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
              }}
            >
              <Text
                style={{ color: theme.colors.onSurface, fontWeight: '600', lineHeight: 22 }}
              >
                {sessionComplete
                  ? 'When you\'re ready, continue to the next step — or come back to this anytime from Mindfulness.'
                  : running
                    ? currentCue.text
                    : 'Take a slow breath in, then press start.'}
              </Text>
            </View>
          </Animated.View>

        </View>
      </ScrollView>

      <View style={{ paddingTop: 16 }}>
        {sessionComplete ? (
          <Button
            mode="contained"
            onPress={() => nav.replace('Meds')}
            style={{ marginBottom: 12 }}
            contentStyle={{ paddingVertical: 4 }}
            accessibilityLabel="Continue to medications step"
          >
            Continue
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={() => {
              if (!running) {
                setSessionComplete(false);
                setRunning(true);
                setSecondsLeft(60);
              }
            }}
            disabled={running}
            style={{ marginBottom: 12 }}
            contentStyle={{ paddingVertical: 4 }}
            accessibilityLabel="Start 60-second breathing reset"
          >
            {running ? `${secondsLeft}s remaining…` : 'Start 60-second reset'}
          </Button>
        )}
        {!sessionComplete ? (
          <Button mode="text" onPress={() => nav.replace('Meds')} accessibilityLabel="Skip reset">
            Not now
          </Button>
        ) : null}
      </View>
    </View>
  );
}
