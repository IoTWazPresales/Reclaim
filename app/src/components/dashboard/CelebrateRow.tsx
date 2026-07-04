/**
 * CelebrateRow — streak reward surface with ember sheen + large center numbers.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { ProgressRing } from '@/components/ProgressRing';
import { StreakFlame } from '@/components/dashboard/StreakFlame';
import { getBadgesFor, type StreakBadge, type StreakType } from '@/lib/streaks';
import { useAppTheme, RECLAIM_CHROME } from '@/theme';
import { dashboardStreakCardTokens } from '@/theme/dashboardStreakCard';

function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255).toString(16).padStart(2, '0');
  const h = hex.replace('#', '');
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}${aa}`;
  if (h.length === 6) return `#${h}${aa}`;
  return hex;
}

function earnedBadges(type: StreakType, count: number) {
  return getBadgesFor(type).filter((b) => count >= b.threshold);
}

function nextUnlockFromStreak(type: StreakType, count: number) {
  const safe = Math.max(0, count || 0);
  const badges = [...getBadgesFor(type)].sort((a, b) => a.threshold - b.threshold);
  const next = badges.find((b) => safe < b.threshold);
  if (!next) {
    return { progress: 1, nextBadge: null as StreakBadge | null, daysToGo: 0 };
  }
  const prevThreshold = badges.filter((b) => b.threshold <= safe).pop()?.threshold ?? 0;
  const span = Math.max(1, next.threshold - prevThreshold);
  const progress = Math.max(0, Math.min(1, (safe - prevThreshold) / span));
  return { progress, nextBadge: next, daysToGo: next.threshold - safe };
}

const DOMAIN_LABEL: Record<StreakType, string> = {
  mood: 'Mood',
  sleep: 'Sleep',
  medication: 'Meds',
  mindfulness: 'Mindfulness',
};

function closestNextBadgeLine(
  mood: { count: number },
  sleep: { count: number },
  meds: { count: number },
): string | null {
  const entries: { type: StreakType; count: number }[] = [
    { type: 'mood', count: mood.count },
    { type: 'sleep', count: sleep.count },
    { type: 'medication', count: meds.count },
  ];
  let best: { daysToGo: number; line: string } | null = null;
  for (const e of entries) {
    const { nextBadge, daysToGo } = nextUnlockFromStreak(e.type, e.count);
    if (!nextBadge || daysToGo <= 0) continue;
    const line = `Next badge: ${nextBadge.threshold}-day ${DOMAIN_LABEL[e.type]} — ${daysToGo} day${daysToGo === 1 ? '' : 's'} to go`;
    if (!best || daysToGo < best.daysToGo) best = { daysToGo, line };
  }
  return best?.line ?? null;
}

type OrbProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  type: StreakType;
  streakCount: number;
  shields: number;
  accent: string;
  reduceMotion: boolean;
};

function AchievementOrb({ icon, label, type, streakCount, shields, accent, reduceMotion }: OrbProps) {
  const theme = useTheme();
  const safe = Math.max(0, streakCount || 0);
  const { progress } = nextUnlockFromStreak(type, safe);
  const active = safe >= 1;

  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>
      <View style={{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center' }}>
        <StreakFlame active={active} reduceMotion={reduceMotion} color={withAlpha(dashboardStreakCardTokens.ember, 0.45)} />
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: withAlpha(accent, active ? 0.08 : 0.04),
            borderWidth: active ? 1 : 1.5,
            borderColor: active ? withAlpha(accent, 0.2) : withAlpha(accent, 0.35),
            borderStyle: active ? 'solid' : 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ProgressRing
            size={80}
            strokeWidth={7}
            progress={progress}
            valueText={`${safe}`}
            label=""
            progressColor={accent}
            reduceMotion={reduceMotion}
            valueTextStyle={{
              fontSize: dashboardStreakCardTokens.centerNumberSize,
              fontWeight: dashboardStreakCardTokens.centerNumberWeight,
            }}
            accessibilityLabel={`${label}, ${safe} day streak`}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
        <MaterialCommunityIcons name={icon} size={13} color={accent} />
        <Text variant="labelMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
          {label}
        </Text>
      </View>

      <Text variant="labelSmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
        {safe > 0 ? `${safe}d streak` : 'start today'}
      </Text>

      {shields > 0 ? (
        <Text
          variant="labelSmall"
          style={{ marginTop: 1, color: accent, opacity: 0.85, textAlign: 'center' }}
          accessibilityLabel="Shield available — one missed day protected"
        >
          shield ready
        </Text>
      ) : null}
    </View>
  );
}

function StreakCardSheen() {
  const gradId = 'streakSheen';
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0.12" y2="1">
          <Stop offset="0" stopColor={dashboardStreakCardTokens.sheenTop} stopOpacity={1} />
          <Stop offset="1" stopColor={dashboardStreakCardTokens.sheenBottom} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${gradId})`} />
    </Svg>
  );
}

export type CelebrateRowProps = {
  reduceMotion?: boolean;
  cardRadius?: number;
  sectionGap?: number;
  mood: { count: number; longest: number; shields?: number };
  sleep: { count: number; longest: number; shields?: number };
  meds: { count: number; longest: number; shields?: number };
  accents?: { mood?: string; sleep?: string; meds?: string };
  onBadgeCrossed?: (badge: StreakBadge, streakCount: number, type: StreakType) => void;
};

export function CelebrateRow({
  cardRadius = RECLAIM_CHROME.cardRadius,
  sectionGap = 0,
  reduceMotion = false,
  mood,
  sleep,
  meds,
  accents,
  onBadgeCrossed,
}: CelebrateRowProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  const moodAccent = accents?.mood ?? appTheme.domainAccents.mood;
  const sleepAccent = accents?.sleep ?? appTheme.domainAccents.sleep;
  const medsAccent = accents?.meds ?? appTheme.domainAccents.meds;

  const allZero = mood.count === 0 && sleep.count === 0 && meds.count === 0;
  const progressLine = useMemo(() => closestNextBadgeLine(mood, sleep, meds), [mood.count, sleep.count, meds.count]);

  const allEarned = [
    ...earnedBadges('mood', mood.count).map((b) => ({ ...b, accent: moodAccent })),
    ...earnedBadges('sleep', sleep.count).map((b) => ({ ...b, accent: sleepAccent })),
    ...earnedBadges('medication', meds.count).map((b) => ({ ...b, accent: medsAccent })),
  ];

  const prevCountsRef = useRef({ mood: mood.count, sleep: sleep.count, meds: meds.count });
  useEffect(() => {
    if (!onBadgeCrossed) return;
    const prev = prevCountsRef.current;
    const checks: { type: StreakType; count: number; prev: number }[] = [
      { type: 'mood', count: mood.count, prev: prev.mood },
      { type: 'sleep', count: sleep.count, prev: prev.sleep },
      { type: 'medication', count: meds.count, prev: prev.meds },
    ];
    for (const c of checks) {
      if (c.count <= c.prev) continue;
      const crossed = getBadgesFor(c.type).filter((b) => c.prev < b.threshold && c.count >= b.threshold);
      if (crossed.length > 0) {
        onBadgeCrossed(crossed[crossed.length - 1], c.count, c.type);
      }
    }
    prevCountsRef.current = { mood: mood.count, sleep: sleep.count, meds: meds.count };
  }, [mood.count, sleep.count, meds.count, onBadgeCrossed]);

  return (
    <View style={sectionGap > 0 ? { marginBottom: sectionGap } : undefined}>
      <Card mode="elevated" style={{ borderRadius: cardRadius, overflow: 'hidden', backgroundColor: 'transparent' }}>
        <View style={StyleSheet.absoluteFill}>
          <StreakCardSheen />
        </View>
        <Card.Content style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
          <FeatureCardHeader icon="trophy-outline" title="Streaks" subtitle="Small chains, big changes." />

          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', marginTop: 16 }}>
            <AchievementOrb icon="emoticon-happy-outline" label="Mood" type="mood" streakCount={mood.count} shields={mood.shields ?? 0} accent={moodAccent} reduceMotion={reduceMotion} />
            <AchievementOrb icon="sleep" label="Sleep" type="sleep" streakCount={sleep.count} shields={sleep.shields ?? 0} accent={sleepAccent} reduceMotion={reduceMotion} />
            <AchievementOrb icon="pill" label="Meds" type="medication" streakCount={meds.count} shields={meds.shields ?? 0} accent={medsAccent} reduceMotion={reduceMotion} />
          </View>

          {progressLine ? (
            <Text variant="bodySmall" style={{ marginTop: 14, color: theme.colors.onSurface, lineHeight: 18 }}>
              {progressLine}
            </Text>
          ) : null}

          {allEarned.length > 0 ? (
            <View style={{ marginTop: 14 }}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
                Badges earned
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {allEarned.map((badge) => (
                  <View
                    key={badge.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: withAlpha(badge.accent, 0.12),
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderWidth: 1,
                      borderColor: withAlpha(badge.accent, 0.28),
                      gap: 6,
                    }}
                  >
                    <MaterialCommunityIcons name="medal-outline" size={13} color={badge.accent} />
                    <Text variant="labelSmall" style={{ color: badge.accent, fontWeight: '700' }}>
                      {badge.title}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : allZero ? (
            <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant, fontSize: 12, lineHeight: 17 }}>
              Badges unlock at 7, 14, 30 and 90-day streaks — keep going.
            </Text>
          ) : null}
        </Card.Content>
      </Card>
    </View>
  );
}
