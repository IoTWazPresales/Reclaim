import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Button, useTheme, Card, Chip, TextInput, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { useSyncOnboardingRoute } from '@/hooks/useSyncOnboardingRoute';
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
  const navigation = useNavigation<Nav>();
  useSyncOnboardingRoute('Capabilities');
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

            {/* ── Slide 2: Sleep ── */}
            {index === 2 && (
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
                    style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}
                  >
                    8 h 30 m · Sleep quality: Good
                  </Text>
                  {/* Simple stage stats */}
                  {[
                    { label: 'Deep sleep',  value: '1 h 45 m', color: '#1e88e5' },
                    { label: 'REM sleep',   value: '1 h 20 m', color: '#ab47bc' },
                    { label: 'Efficiency',  value: '85%',       color: theme.colors.primary },
                  ].map(({ label, value, color }) => (
                    <View
                      key={label}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: color,
                          }}
                        />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {label}
                        </Text>
                      </View>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurface, fontWeight: '700' }}
                      >
                        {value}
                      </Text>
                    </View>
                  ))}
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
                    Next session
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: theme.colors.primaryContainer,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MaterialCommunityIcons
                          name="dumbbell"
                          size={20}
                          color={theme.colors.onPrimaryContainer}
                        />
                      </View>
                      <View>
                        <Text
                          variant="bodyMedium"
                          style={{ fontWeight: '700', color: theme.colors.onSurface }}
                        >
                          Upper Body
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          Chest · Shoulders · Triceps
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        backgroundColor: theme.colors.surfaceVariant,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        variant="labelSmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        ~42 min
                      </Text>
                    </View>
                  </View>
                  {/* Exercise list preview */}
                  {[
                    'Bench press  ·  4 × 8',
                    'Overhead press  ·  3 × 10',
                    'Cable flyes  ·  3 × 12',
                  ].map(ex => (
                    <View
                      key={ex}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="circle-small"
                        size={16}
                        color={theme.colors.outlineVariant}
                      />
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {ex}
                      </Text>
                    </View>
                  ))}
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
