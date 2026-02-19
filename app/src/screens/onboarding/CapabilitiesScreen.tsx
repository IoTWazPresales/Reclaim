import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Button, useTheme, Card, Chip, TextInput, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import Animated, {
  FadeInRight,
  FadeInLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ReduceMotion,
} from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Capabilities'>;

// ─── hypnogram ───────────────────────────────────────────────────────────────
type LegacySleepStage = 'awake' | 'light' | 'deep' | 'rem' | 'unknown';
type LegacySleepStageSegment = { start: string; end: string; stage: LegacySleepStage };

function safeDate(input: any): Date | null {
  if (!input) return null;
  const d =
    input instanceof Date
      ? input
      : typeof input === 'number'
        ? new Date(input)
        : typeof input === 'string'
          ? new Date(input)
          : null;
  if (!d) return null;
  const t = d.getTime();
  if (!Number.isFinite(t) || t > 8.64e15 || t < -8.64e15) return null;
  return d;
}

function Hypnogram({ segments }: { segments: LegacySleepStageSegment[] }) {
  const theme = useTheme();
  const STAGE_COLORS: Record<string, string> = {
    awake: '#f4b400',
    light: '#64b5f6',
    deep: '#1e88e5',
    rem: '#ab47bc',
    unknown: theme.colors.secondary,
  };

  const safeSegs = useMemo(() =>
    (segments ?? [])
      .map(seg => {
        const st = safeDate(seg?.start);
        const en = safeDate(seg?.end);
        if (!st || !en || en.getTime() <= st.getTime()) return null;
        return { ...seg, __st: st, __en: en };
      })
      .filter(Boolean) as Array<LegacySleepStageSegment & { __st: Date; __en: Date }>,
    [segments],
  );

  if (!safeSegs.length) return null;

  const start = safeSegs[0].__st.getTime();
  const end   = safeSegs[safeSegs.length - 1].__en.getTime();
  const total = Math.max(1, end - start);

  const stageLevel = (s: LegacySleepStage) => {
    switch (s) {
      case 'awake': return 0;
      case 'light': return 1;
      case 'rem':   return 1.5;
      case 'deep':  return 2;
      default:      return 1;
    }
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ opacity: 0.8, marginBottom: 6, color: theme.colors.onSurfaceVariant }}>
        Hypnogram
      </Text>
      <View
        style={{
          height: 50,
          backgroundColor: theme.colors.surface,
          borderRadius: 10,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        {safeSegs.map((seg, i) => {
          const segLen  = seg.__en.getTime() - seg.__st.getTime();
          const w       = Math.max(2, Math.round((segLen / total) * 300));
          const leftPct = ((seg.__st.getTime() - start) / total) * 100;
          const y       = stageLevel(seg.stage);
          return (
            <View
              key={`seg-${i}-${seg.stage}`}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                bottom: y * 12,
                width: w,
                height: 6,
                borderRadius: 6,
                backgroundColor: STAGE_COLORS[seg.stage] ?? theme.colors.secondary,
                opacity: seg.stage === 'awake' ? 0.32 : 0.72,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

// Hardcoded preview sleep data (8.5 hours, 23:00–07:30)
const exampleSegments: LegacySleepStageSegment[] = [
  { start: '2024-01-01T23:00:00Z', end: '2024-01-01T23:15:00Z', stage: 'light' },
  { start: '2024-01-01T23:15:00Z', end: '2024-01-01T23:45:00Z', stage: 'deep' },
  { start: '2024-01-01T23:45:00Z', end: '2024-01-02T00:30:00Z', stage: 'light' },
  { start: '2024-01-02T00:30:00Z', end: '2024-01-02T01:00:00Z', stage: 'rem' },
  { start: '2024-01-02T01:00:00Z', end: '2024-01-02T01:45:00Z', stage: 'light' },
  { start: '2024-01-02T01:45:00Z', end: '2024-01-02T02:15:00Z', stage: 'deep' },
  { start: '2024-01-02T02:15:00Z', end: '2024-01-02T03:00:00Z', stage: 'light' },
  { start: '2024-01-02T03:00:00Z', end: '2024-01-02T03:30:00Z', stage: 'rem' },
  { start: '2024-01-02T03:30:00Z', end: '2024-01-02T05:00:00Z', stage: 'light' },
  { start: '2024-01-02T05:00:00Z', end: '2024-01-02T05:30:00Z', stage: 'rem' },
  { start: '2024-01-02T05:30:00Z', end: '2024-01-02T07:15:00Z', stage: 'light' },
  { start: '2024-01-02T07:15:00Z', end: '2024-01-02T07:30:00Z', stage: 'awake' },
];

// ─── slides ──────────────────────────────────────────────────────────────────
const slides = [
  {
    title: 'Your daily signal',
    body:  'One clear insight each day — built from your mood, sleep, and habits.',
  },
  {
    title: 'Mood in two taps',
    body:  'Log how you feel in seconds. Patterns emerge over time.',
  },
  {
    title: 'Sleep & meds support',
    body:  'Keep your recovery steady, without guilt.',
  },
  {
    title: 'Mindfulness resets',
    body:  'Quick guided exercises to help your nervous system settle.',
  },
] as const;

// ─── animated dot indicator ──────────────────────────────────────────────────
function AnimatedDot({ active }: { active: boolean }) {
  const theme = useTheme();
  const width = useSharedValue(active ? 20 : 8);

  useEffect(() => {
    width.value = withSpring(active ? 20 : 8, { damping: 16, stiffness: 260 });
  }, [active, width]);

  const style = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          marginRight: 6,
          backgroundColor: active ? theme.colors.primary : theme.colors.outlineVariant,
        },
        style,
      ]}
    />
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────
export default function CapabilitiesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [index, setIndex] = useState(0);
  const prevIndex = useRef(0);

  const slide  = slides[index];
  const isLast = index === slides.length - 1;

  function goNext() {
    if (isLast) {
      navigation.replace('MoodCheckin');
    } else {
      prevIndex.current = index;
      setIndex(i => i + 1);
    }
  }

  // Direction: 1 = going forward (slide in from right), -1 = going back (from left)
  const direction  = index >= prevIndex.current ? 1 : -1;
  const slideEnter = direction > 0
    ? FadeInRight.duration(280).springify().damping(26).reduceMotion(ReduceMotion.System)
    : FadeInLeft.duration(280).springify().damping(26).reduceMotion(ReduceMotion.System);

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginBottom: 16, alignSelf: 'flex-start' }}
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', overflow: 'hidden' }}>

          {/* Animated slide content — key change triggers the entering animation */}
          <Animated.View key={`slide-${index}`} entering={slideEnter}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                marginBottom: 10,
                color: theme.colors.onSurface,
              }}
            >
              {slide.title}
            </Text>
            <Text
              style={{
                opacity: 0.8,
                marginBottom: 20,
                color: theme.colors.onSurfaceVariant,
                lineHeight: 22,
                fontSize: 15,
              }}
            >
              {slide.body}
            </Text>

            {/* Preview cards */}
            {index === 0 && (
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
                    Today's insight
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
            )}

            {index === 1 && (
              <Card
                mode="outlined"
                style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}
              >
                <Card.Content>
                  <Text
                    variant="labelSmall"
                    style={{
                      color: theme.colors.primary,
                      marginBottom: 10,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                    }}
                  >
                    How are you feeling?
                  </Text>
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                      const selected = n === 7;
                      return (
                        <Chip
                          key={n}
                          selected={selected}
                          mode={selected ? 'flat' : 'outlined'}
                          style={{ marginRight: 6, marginBottom: 6 }}
                        >
                          {n}
                        </Chip>
                      );
                    })}
                  </View>
                  <TextInput
                    mode="outlined"
                    label="Optional note"
                    value="Feeling good today"
                    editable={false}
                    style={{ backgroundColor: theme.colors.surface }}
                  />
                </Card.Content>
              </Card>
            )}

            {index === 2 && (
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
                    Last night
                  </Text>
                  <Text
                    variant="bodyLarge"
                    style={{ marginBottom: 4, color: theme.colors.onSurface, fontWeight: '700' }}
                  >
                    23:00 → 07:30
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}
                  >
                    8.5 hours • Efficiency: 85%
                  </Text>
                  <Hypnogram segments={exampleSegments} />
                </Card.Content>
              </Card>
            )}

            {index === 3 && (
              <Card
                mode="outlined"
                style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}
              >
                <Card.Content>
                  <Text
                    variant="bodyMedium"
                    style={{
                      marginBottom: 12,
                      color: theme.colors.onSurface,
                      fontWeight: '700',
                    }}
                  >
                    Box Breathing
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}
                  >
                    Inhale 4 · Hold 4 · Exhale 4 · Hold 4
                  </Text>
                  <View style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: 70,
                        backgroundColor: theme.colors.primaryContainer,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: theme.colors.primary,
                        shadowOpacity: 0.35,
                        shadowRadius: 16,
                        elevation: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: theme.colors.onPrimaryContainer,
                          marginBottom: 6,
                        }}
                      >
                        Inhale
                      </Text>
                      <Text
                        style={{
                          fontSize: 52,
                          fontWeight: '800',
                          color: theme.colors.onPrimaryContainer,
                          lineHeight: 56,
                        }}
                      >
                        4
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: theme.colors.onPrimaryContainer,
                          opacity: 0.7,
                          marginTop: 2,
                        }}
                      >
                        seconds
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            )}
          </Animated.View>

          {/* Dot indicator (animated pills) */}
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            {slides.map((_, i) => (
              <AnimatedDot key={i} active={i === index} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingTop: 16 }}>
        <Button
          mode="contained"
          onPress={goNext}
          style={{ marginBottom: 12 }}
          contentStyle={{ paddingVertical: 4 }}
          accessibilityLabel={isLast ? 'Continue to mood check-in' : 'Next'}
        >
          {isLast ? 'Continue' : 'Next'}
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.replace('MoodCheckin')}
          accessibilityLabel="Skip capability walkthrough"
        >
          Skip
        </Button>
      </View>
    </View>
  );
}
