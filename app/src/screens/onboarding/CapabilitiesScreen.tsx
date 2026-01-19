import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Button, useTheme, Card, Chip, TextInput, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Capabilities'>;

type LegacySleepStage = 'awake' | 'light' | 'deep' | 'rem' | 'unknown';

type LegacySleepStageSegment = {
  start: string;
  end: string;
  stage: LegacySleepStage;
};

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
  if (!Number.isFinite(t)) return null;
  if (t > 8.64e15 || t < -8.64e15) return null;
  return d;
}

function Hypnogram({ segments }: { segments: LegacySleepStageSegment[] }) {
  const theme = useTheme();
  const textColor = theme.colors.onSurfaceVariant;
  const bandBackground = theme.colors.surface;
  const STAGE_COLORS: Record<string, string> = {
    awake: '#f4b400',
    light: '#64b5f6',
    deep: '#1e88e5',
    rem: '#ab47bc',
    unknown: theme.colors.secondary,
  };

  const withAlpha = (color: string, alpha: number) => {
    const a = Math.max(0, Math.min(1, alpha));
    const hex = color.replace('#', '').trim();
    const full = hex.length === 3 ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}` : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return color;
    return `rgba(${r},${g},${b},${a})`;
  };

  const safeSegments = useMemo(() => {
    return (segments ?? [])
      .map((seg, idx) => {
        const st = safeDate(seg?.start);
        const en = safeDate(seg?.end);
        if (!st || !en || en.getTime() <= st.getTime()) return null;
        return { ...seg, __st: st, __en: en };
      })
      .filter(Boolean) as Array<LegacySleepStageSegment & { __st: Date; __en: Date }>;
  }, [segments]);

  if (!safeSegments.length) return null;

  const start = safeSegments[0].__st.getTime();
  const end = safeSegments[safeSegments.length - 1].__en.getTime();
  const total = Math.max(1, end - start);

  const stageLevel = (s: LegacySleepStage) => {
    switch (s) {
      case 'awake':
        return 0;
      case 'light':
        return 1;
      case 'rem':
        return 1.5;
      case 'deep':
        return 2;
      default:
        return 1;
    }
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ opacity: 0.8, marginBottom: 6, color: textColor }}>Hypnogram</Text>
      <View
        style={{
          height: 50,
          backgroundColor: bandBackground,
          borderRadius: 10,
          overflow: 'hidden',
          position: 'relative',
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        {safeSegments.map((seg, i) => {
          const segLen = seg.__en.getTime() - seg.__st.getTime();
          const w = Math.max(2, Math.round((segLen / total) * 300));
          const leftPct = ((seg.__st.getTime() - start) / total) * 100;
          const y = stageLevel(seg.stage);
          const isLast = i === safeSegments.length - 1;
          return (
            <View
              key={`sleep-segment-${i}-${seg.stage}`}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                bottom: y * 12,
                width: w,
                height: 6,
                borderRadius: 6,
                backgroundColor: withAlpha(STAGE_COLORS[seg.stage] ?? theme.colors.secondary, 0.72),
                opacity: seg.stage === 'awake' ? 0.32 : 1,
                borderRightWidth: isLast ? 0 : 1,
                borderRightColor: 'rgba(255,255,255,0.10)',
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const slides = [
  { title: 'Daily guidance', body: 'A single insight that actually matters today.' },
  { title: 'Mood in two taps', body: 'Check in fast. Track patterns over time.' },
  { title: 'Sleep & meds support', body: 'Keep your recovery steady — without guilt.' },
  { title: 'Mindfulness exercises', body: 'Quick resets to help your nervous system settle.' },
] as const;

// Hardcoded hypnogram data for preview (8.5 hours: 23:00 to 07:30)
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

export default function CapabilitiesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [index, setIndex] = useState(0);

  const slide = slides[index];
  const isLast = index === slides.length - 1;

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
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>{slide.title}</Text>
          <Text style={{ opacity: 0.8, marginBottom: 20, color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>{slide.body}</Text>

          {index === 0 ? (
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
          ) : index === 1 ? (
            <Card mode="outlined" style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}>
              <Card.Content>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                    const selected = n === 7;
                    return (
                      <Chip key={n} selected={selected} mode={selected ? 'flat' : 'outlined'} style={{ marginRight: 6, marginBottom: 6 }}>
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
          ) : index === 2 ? (
            <Card mode="outlined" style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ marginBottom: 4, color: theme.colors.onSurface }}>
                  Last night
                </Text>
                <Text variant="bodyLarge" style={{ marginBottom: 8, color: theme.colors.onSurface }}>
                  23:00 → 07:30
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                  8.5 hours • Efficiency: 85%
                </Text>
                <Hypnogram segments={exampleSegments} />
              </Card.Content>
            </Card>
          ) : index === 3 ? (
            <Card mode="outlined" style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ marginBottom: 12, color: theme.colors.onSurface, fontWeight: '600' }}>
                  Box Breathing
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
                  Inhale 4, hold 4, exhale 4, hold 4. Complete 4 cycles.
                </Text>
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 160,
                      height: 160,
                      borderRadius: 80,
                      backgroundColor: theme.colors.primaryContainer,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: theme.colors.primary,
                      shadowOpacity: 0.35,
                      shadowRadius: 12,
                    }}
                  >
                    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: theme.colors.onPrimaryContainer,
                          marginBottom: 8,
                          textAlign: 'center',
                        }}
                      >
                        Inhale
                      </Text>
                      <Text
                        style={{
                          fontSize: 56,
                          fontWeight: '700',
                          color: theme.colors.onPrimaryContainer,
                          lineHeight: 60,
                          textAlign: 'center',
                        }}
                      >
                        4
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: theme.colors.onPrimaryContainer,
                          opacity: 0.7,
                          marginTop: 4,
                          textAlign: 'center',
                        }}
                      >
                        seconds
                      </Text>
                    </View>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ) : null}

          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginRight: 6,
                  backgroundColor: i === index ? theme.colors.primary : theme.colors.outlineVariant,
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingTop: 16 }}>
        <Button
          mode="contained"
          onPress={() => {
            if (isLast) {
              navigation.replace('MoodCheckin');
            } else {
              setIndex((i) => Math.min(i + 1, slides.length - 1));
            }
          }}
          style={{ marginBottom: 12 }}
          accessibilityLabel={isLast ? 'Continue to mood check-in' : 'Next capability'}
        >
          {isLast ? 'Continue' : 'Next'}
        </Button>
        <Button mode="text" onPress={() => navigation.replace('MoodCheckin')} accessibilityLabel="Skip to mood check-in">
          Skip
        </Button>
      </View>
    </View>
  );
}


