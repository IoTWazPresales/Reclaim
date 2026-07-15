import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { Button, useTheme, Card, Chip, TextInput, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { useSyncOnboardingRoute } from '@/hooks/useSyncOnboardingRoute';
import { SleepHero } from '@/components/dashboard/SleepHero';
import { TrainingWeekRailVisual, type TrainingRailCell } from '@/components/dashboard/HomeDashboardTile';
import { BreathOrb } from '@/components/mindfulness/BreathOrb';
import { useAppTheme } from '@/theme';
import { reclaimChip } from '@/theme/reclaimVisualLanguage';
import Animated, {
  FadeInRight,
  FadeInLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ReduceMotion,
} from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Capabilities'>;

// ─── slides ──────────────────────────────────────────────────────────────────
const slides = [
  {
    title: 'Your daily signal',
    body:  'Reclaim connects your mood, sleep, training, and meds into a personalised daily read on Home.',
  },
  {
    title: 'Mood in two taps',
    body:  'Log how you feel in seconds. Patterns emerge over time — and become part of your daily signal.',
  },
  {
    title: 'Sleep & recovery',
    body:  'Track your sleep quality, consistency, and how it shapes your next day.',
  },
  {
    title: 'Training & exercise',
    body:  'Follow a structured training plan you can adjust week to week as your energy and schedule change.',
  },
  {
    title: 'Mindfulness resets',
    body:  'Quick guided exercises to help your nervous system settle between sessions.',
  },
] as const;

// ─── animated dot indicator ──────────────────────────────────────────────────
function AnimatedDot({
  active,
  index,
  total,
  onPress,
}: {
  active: boolean;
  index: number;
  total: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const width = useSharedValue(active ? 20 : 8);

  useEffect(() => {
    width.value = withSpring(active ? 20 : 8, { damping: 16, stiffness: 260 });
  }, [active, width]);

  const style = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Slide ${index + 1} of ${total}`}
      hitSlop={12}
      style={{ minHeight: 48, justifyContent: 'center', marginRight: 6 }}
    >
      <Animated.View
        style={[
          {
            height: 8,
            borderRadius: 4,
            backgroundColor: active ? theme.colors.primary : theme.colors.outlineVariant,
          },
          style,
        ]}
      />
    </Pressable>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────
function PreviewDemoLabel() {
  const theme = useTheme();
  return (
    <Text variant="labelSmall" style={{ color: theme.colors.outline, marginBottom: 8, fontStyle: 'italic' }}>
      Preview — not your data
    </Text>
  );
}

export default function CapabilitiesScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const navigation = useNavigation<Nav>();
  useSyncOnboardingRoute('Capabilities');
  const [index, setIndex] = useState(0);
  const prevIndex = useRef(0);
  const [previewRating, setPreviewRating] = useState(7);

  const previewRailCells = useMemo((): TrainingRailCell[] => {
    return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((key, i) => ({
      key: `${key}-${i}`,
      state: i < 3 ? 'done' : i === 3 ? 'planned' : 'rest',
      isToday: i === 3,
    }));
  }, []);

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

            {/* ── Slide 0: Daily signal ── */}
            {index === 0 && (
              <Card
                mode="outlined"
                style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}
              >
                <Card.Content>
                  <PreviewDemoLabel />
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
                    Take a 10–20 min sunlight walk before your session today.
                  </Text>
                  {/* Signal contributors */}
                  <View
                    style={{
                      flexDirection: 'row',
                      marginTop: 14,
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    {[
                      { icon: 'emoticon-happy-outline', label: 'Mood 7/10' },
                      { icon: 'sleep',                  label: '5h 40m' },
                      { icon: 'dumbbell',               label: 'Rest day' },
                    ].map(({ icon, label }) => (
                      <View
                        key={label}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: theme.colors.surfaceVariant,
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          gap: 4,
                        }}
                      >
                        <MaterialCommunityIcons
                          name={icon as any}
                          size={13}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text
                          variant="labelSmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* ── Slide 1: Mood ── */}
            {index === 1 && (
              <Card
                mode="outlined"
                style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}
              >
                <Card.Content>
                  <PreviewDemoLabel />
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
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                      const selected = n === previewRating;
                      const chip = reclaimChip(appTheme, selected ? 'selected' : 'actionable');
                      return (
                        <TouchableOpacity
                          key={n}
                          onPress={() => setPreviewRating(n)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`Preview mood rating ${n}`}
                          style={[chip.container as object, { marginRight: 6, marginBottom: 6, minWidth: 40, alignItems: 'center' }]}
                        >
                          <Text style={chip.label as object}>{n}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    Selected: {previewRating}/10
                  </Text>
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

            {/* ── Slide 2: Sleep ── */}
            {index === 2 && (
              <Card
                mode="outlined"
                style={{ marginBottom: 24, backgroundColor: theme.colors.surface, overflow: 'hidden' }}
              >
                <Card.Content style={{ paddingHorizontal: 0 }}>
                  <View style={{ paddingHorizontal: 16 }}>
                    <PreviewDemoLabel />
                  </View>
                  <View style={{ transform: [{ scale: 0.82 }], marginTop: -8, marginBottom: -24 }}>
                    <SleepHero
                      durationMin={510}
                      targetSleepMinutes={480}
                      efficiency={85}
                      quality={76}
                      hasData
                      heroState={{
                        title: 'Waxing gibbous',
                        statLine: 'Main sleep · 8h 30m · 76/100 · 85% of target',
                        deltas: [],
                        subtitle: 'Good rest, slight room to optimize.',
                      }}
                      confidence={{ label: 'Low', confPct: 30 }}
                      trendDaysCount={3}
                    />
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* ── Slide 3: Training ── */}
            {index === 3 && (
              <Card
                mode="outlined"
                style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}
              >
                <Card.Content>
                  <PreviewDemoLabel />
                  <Text
                    variant="labelSmall"
                    style={{
                      color: theme.colors.primary,
                      marginBottom: 12,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                    }}
                  >
                    This week
                  </Text>
                  <TrainingWeekRailVisual
                    cells={previewRailCells}
                    dark={theme.dark}
                    accent={appTheme.domainAccents.training}
                  />
                  <Text variant="bodySmall" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
                    Upper body planned today · ~42 min
                  </Text>
                </Card.Content>
              </Card>
            )}

            {/* ── Slide 4: Mindfulness ── */}
            {index === 4 && (
              <Card
                mode="outlined"
                style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}
              >
                <Card.Content>
                  <PreviewDemoLabel />
                  <BreathOrb
                    streak={0}
                    latestText="Tap for a 2-minute reset"
                    onPress={() => {}}
                  />
                </Card.Content>
              </Card>
            )}
          </Animated.View>

          {/* Dot indicator (animated pills) */}
          <View
            style={{ flexDirection: 'row', marginBottom: 20, alignItems: 'center' }}
            accessibilityRole="tablist"
          >
            {slides.map((_, i) => (
              <AnimatedDot
                key={i}
                active={i === index}
                index={i}
                total={slides.length}
                onPress={() => {
                  prevIndex.current = index;
                  setIndex(i);
                }}
              />
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
          accessibilityLabel={
            isLast
              ? 'Continue to mood check-in'
              : `Next, slide ${index + 2} of ${slides.length}`
          }
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
