/**
 * CelebrateRow — streak-level orbs + earned badge strip.
 *
 * Design decisions (pass-3 clean-up):
 *  • AchievementOrb no longer wraps ProgressRing inside overflow:hidden /
 *    borderRadius — that was clipping the Skia Canvas and creating rendering
 *    artefacts. The ring is now a first-class element with no clip container.
 *  • Removed the Animated glow blob that was fighting with the ring visually.
 *  • Consistent sizing and typography with dashboard companion cards.
 *  • Card elevation and colour matches the rest of the dashboard.
 */
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { ProgressRing } from '@/components/ProgressRing';
import { getBadgesFor, type StreakType } from '@/lib/streaks';

// ─── domain palette ───────────────────────────────────────────────────────────
// Fixed colours per domain — consistent with dashboard domain accents, never inferred
// from theme secondary/tertiary which share the same value or fall back to pink.
const DOMAIN_ACCENT = {
  mood:  '#60a5fa', // blue
  sleep: '#818cf8', // indigo / violet
  meds:  '#34d399', // emerald
} as const;

// ─── helpers ──────────────────────────────────────────────────────────────────

function withAlpha(hex: string, alpha: number): string {
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

// ─── AchievementOrb ───────────────────────────────────────────────────────────
/**
 * Clean orb: ProgressRing rendered without any overflow:hidden parent
 * (that was clipping the Skia Canvas on Android).
 * Icon + label sit below the ring for clarity.
 */
type OrbProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  streakCount: number;
  longest: number;
  shields: number;
  accent: string;
};

function AchievementOrb({ icon, label, streakCount, shields, accent }: OrbProps) {
  const theme = useTheme();
  const { level, progress, nextAt } = levelFromStreak(streakCount);

  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>

      {/* Subtle coloured circle behind the ring — drawn as a plain View,
          NOT with overflow:hidden, so the Canvas is never clipped.         */}
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: withAlpha(accent, 0.06),
          borderWidth: 1,
          borderColor: withAlpha(accent, 0.15),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ProgressRing sits directly inside the circle bg; no overflow clip */}
        <ProgressRing
          size={80}
          strokeWidth={7}
          progress={progress}
          valueText={`Lv ${level}`}
          label=""
          progressColor={accent}
          accessibilityLabel={`${label} level ${level}, ${streakCount} day streak`}
        />
      </View>

      {/* Icon + name */}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}
      >
        <MaterialCommunityIcons name={icon} size={13} color={accent} />
        <Text
          variant="labelMedium"
          style={{ fontWeight: '700', color: theme.colors.onSurface }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      {/* Streak count */}
      <Text
        variant="labelSmall"
        style={{ marginTop: 2, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
        numberOfLines={1}
      >
        {streakCount > 0 ? `${streakCount}d streak` : 'Start today'}
      </Text>

      {/* Shield indicator or next badge hint */}
      {shields > 0 ? (
        <Text
          variant="labelSmall"
          style={{ marginTop: 1, color: accent, opacity: 0.85, textAlign: 'center' }}
          numberOfLines={1}
          accessibilityLabel="Shield available — one missed day protected"
        >
          🛡 shield ready
        </Text>
      ) : streakCount > 0 ? (
        <Text
          variant="labelSmall"
          style={{ marginTop: 1, color: theme.colors.onSurfaceVariant, opacity: 0.55, textAlign: 'center' }}
          numberOfLines={1}
        >
          next: {nextAt}d
        </Text>
      ) : null}
    </View>
  );
}

// ─── CelebrateRow ─────────────────────────────────────────────────────────────

export type CelebrateRowProps = {
  reduceMotion?: boolean;
  cardRadius?: number;
  /**
   * Ignored at 0 — Dashboard’s wrapper applies section spacing below this block.
   * Kept optional so callers / stale bundles never hit an undefined `sectionGap` identifier.
   */
  sectionGap?: number;
  mood:  { count: number; longest: number; shields?: number };
  sleep: { count: number; longest: number; shields?: number };
  meds:  { count: number; longest: number; shields?: number };
  accents?: { mood?: string; sleep?: string; meds?: string };
};

export function CelebrateRow({
  cardRadius = 16,
  sectionGap = 0,
  mood,
  sleep,
  meds,
  accents,
}: CelebrateRowProps) {
  const theme = useTheme();

  const moodAccent  = accents?.mood  ?? DOMAIN_ACCENT.mood;
  const sleepAccent = accents?.sleep ?? DOMAIN_ACCENT.sleep;
  const medsAccent  = accents?.meds  ?? DOMAIN_ACCENT.meds;

  const allEarned = [
    ...earnedBadges('mood',       mood.count).map(b  => ({ ...b, accent: moodAccent })),
    ...earnedBadges('sleep',      sleep.count).map(b => ({ ...b, accent: sleepAccent })),
    ...earnedBadges('medication', meds.count).map(b  => ({ ...b, accent: medsAccent })),
  ];

  return (
    <View style={sectionGap > 0 ? { marginBottom: sectionGap } : undefined}>
      <Card
        mode="elevated"
        style={{
          borderRadius: cardRadius,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Card.Content style={{ paddingVertical: 16, paddingHorizontal: 16 }}>

          <FeatureCardHeader
            icon="trophy-outline"
            title="Streaks"
            subtitle="Consistency is the game."
          />

          {/* Orb row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'flex-start',
              marginTop: 16,
            }}
          >
            <AchievementOrb
              icon="emoticon-happy-outline"
              label="Mood"
              streakCount={mood.count}
              longest={mood.longest}
              shields={mood.shields ?? 0}
              accent={moodAccent}
            />
            <AchievementOrb
              icon="sleep"
              label="Sleep"
              streakCount={sleep.count}
              longest={sleep.longest}
              shields={sleep.shields ?? 0}
              accent={sleepAccent}
            />
            <AchievementOrb
              icon="pill"
              label="Meds"
              streakCount={meds.count}
              longest={meds.longest}
              shields={meds.shields ?? 0}
              accent={medsAccent}
            />
          </View>

          {/* Badge strip */}
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
                      paddingVertical: 5,
                      borderWidth: 1,
                      borderColor: withAlpha(badge.accent, 0.28),
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
            <Text
              style={{
                marginTop: 12,
                color: theme.colors.onSurfaceVariant,
                fontSize: 12,
                lineHeight: 17,
              }}
            >
              Badges unlock at 7, 14, 30 and 90-day streaks — keep going.
            </Text>
          )}

        </Card.Content>
      </Card>
    </View>
  );
}
