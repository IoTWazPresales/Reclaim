import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { ProgressRing } from '@/components/ProgressRing';
import { getBadgesFor, type StreakType } from '@/lib/streaks';

// ─── helpers ─────────────────────────────────────────────────────────────────

function withAlpha(hex: string, alpha: number) {
  const a  = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255).toString(16).padStart(2, '0');
  const h  = hex.replace('#', '');
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}${aa}`;
  if (h.length === 6) return `#${h}${aa}`;
  return hex;
}

function levelFromStreak(count: number) {
  const safe     = Math.max(0, count || 0);
  const level    = Math.floor(safe / 7) + 1;
  const progress = (safe % 7) / 7;
  const nextAt   = level * 7;
  return { level, progress, nextAt };
}

function earnedBadges(type: StreakType, count: number) {
  return getBadgesFor(type).filter(b => count >= b.threshold);
}

// ─── AchievementOrb ──────────────────────────────────────────────────────────

function AchievementOrb(props: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  streakCount: number;
  longest: number;
  accent: string;
  reduceMotion?: boolean;
}) {
  const theme = useTheme();
  const { level, progress, nextAt } = levelFromStreak(props.streakCount);

  // Reanimated pulse: replace old Animated API
  const pulse = useSharedValue(props.reduceMotion ? 0 : 1);

  useEffect(() => {
    if (props.reduceMotion) return;
    pulse.value = withRepeat(
      withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse, props.reduceMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity:   0.08 + pulse.value * 0.06, // 0.08 → 0.14
    transform: [{ scale: 1 + pulse.value * 0.03 }],
  }));

  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
      {/* Ambient glow blob */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: props.accent,
            shadowColor: props.accent,
            shadowOpacity: 0.4,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          },
          glowStyle,
        ]}
      />

      {/* Orb container */}
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          overflow: 'hidden',
        }}
      >
        {/* Subtle tint overlay */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: withAlpha(props.accent, 0.07),
          }}
        />

        {/* ProgressRing (now Skia-powered) */}
        <View style={{ width: 82, height: 82, alignItems: 'center', justifyContent: 'center' }}>
          <ProgressRing
            size={82}
            strokeWidth={8}
            progress={progress}
            valueText={`Lv ${level}`}
            label=""
            progressColor={props.accent}
            trackColor={withAlpha(theme.colors.outlineVariant as string, 0.45)}
            accessibilityLabel={`${props.label} level ${level}, ${props.streakCount} day streak`}
          />

          {/* Icon chip centred over the ring */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: withAlpha(theme.colors.background as string, 0.6),
              borderWidth: 1,
              borderColor: withAlpha(props.accent, 0.3),
            }}
          >
            <MaterialCommunityIcons name={props.icon} size={20} color={props.accent} />
          </View>
        </View>
      </View>

      {/* Labels */}
      <Text
        variant="titleSmall"
        style={{ marginTop: 8, fontWeight: '700', color: theme.colors.onSurface }}
        numberOfLines={1}
      >
        {props.label}
      </Text>
      <Text
        variant="bodySmall"
        style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}
        numberOfLines={1}
      >
        {props.streakCount > 0 ? `${props.streakCount}d streak` : 'Not started'}
      </Text>
      <Text
        variant="bodySmall"
        style={{ marginTop: 1, color: theme.colors.onSurfaceVariant, opacity: 0.7 }}
        numberOfLines={1}
      >
        {props.streakCount > 0 ? `next badge: ${nextAt}d` : '—'}
      </Text>
    </View>
  );
}

// ─── CelebrateRow ─────────────────────────────────────────────────────────────

export type CelebrateRowProps = {
  reduceMotion?: boolean;
  cardRadius?: number;
  sectionGap?: number;

  mood:  { count: number; longest: number };
  sleep: { count: number; longest: number };
  meds:  { count: number; longest: number };

  accents?: { mood?: string; sleep?: string; meds?: string };
};

export function CelebrateRow({
  reduceMotion,
  cardRadius = 16,
  sectionGap = 16,
  mood,
  sleep,
  meds,
  accents,
}: CelebrateRowProps) {
  const theme = useTheme();

  const moodAccent  = accents?.mood  ?? (theme.colors.primary   as string);
  const sleepAccent = accents?.sleep ?? (theme.colors.secondary  as string);
  const medsAccent  = accents?.meds  ?? ((theme.colors as any).tertiary ?? '#00897b');

  // Collect all earned badges across mood / sleep / meds
  const allEarned = [
    ...earnedBadges('mood',       mood.count).map(b => ({ ...b, accent: moodAccent })),
    ...earnedBadges('sleep',      sleep.count).map(b => ({ ...b, accent: sleepAccent })),
    ...earnedBadges('medication', meds.count).map(b => ({ ...b, accent: medsAccent })),
  ];

  return (
    <View style={{ marginBottom: sectionGap }}>
      <Card
        mode="elevated"
        style={{ borderRadius: cardRadius, backgroundColor: theme.colors.surface }}
      >
        <Card.Content style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
          <FeatureCardHeader icon="trophy-outline" title="Celebrate" subtitle="Levels over perfection." />

          {/* Orb row — flex layout with even spacing */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'flex-start',
              marginTop: 14,
            }}
          >
            <AchievementOrb
              icon="emoticon-happy-outline"
              label="Mood"
              streakCount={mood.count}
              longest={mood.longest}
              accent={moodAccent}
              reduceMotion={reduceMotion}
            />
            <AchievementOrb
              icon="sleep"
              label="Sleep"
              streakCount={sleep.count}
              longest={sleep.longest}
              accent={sleepAccent}
              reduceMotion={reduceMotion}
            />
            <AchievementOrb
              icon="pill"
              label="Meds"
              streakCount={meds.count}
              longest={meds.longest}
              accent={medsAccent}
              reduceMotion={reduceMotion}
            />
          </View>

          {/* Badge strip — only shown once the user has earned at least one */}
          {allEarned.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <Text
                variant="labelSmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Badges earned
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {allEarned.map(badge => (
                  <View
                    key={badge.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: withAlpha(badge.accent, 0.12),
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: withAlpha(badge.accent, 0.3),
                      gap: 6,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="medal-outline"
                      size={13}
                      color={badge.accent}
                    />
                    <Text
                      variant="labelSmall"
                      style={{ color: badge.accent, fontWeight: '700' }}
                    >
                      {badge.title}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
              Keep the streak alive — the next level is just one good day at a time.
            </Text>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}
