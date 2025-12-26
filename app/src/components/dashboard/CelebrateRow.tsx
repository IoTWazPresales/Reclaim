import React from 'react';
import { View, Animated } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { ProgressRing } from '@/components/ProgressRing'; // ✅ correct path

function withAlpha(hex: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255).toString(16).padStart(2, '0');

  const h = hex.replace('#', '');
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}${aa}`;
  if (h.length === 6) return `#${h}${aa}`;
  return hex;
}

function levelFromStreak(count: number) {
  const safe = Math.max(0, count || 0);
  const level = Math.floor(safe / 7) + 1;
  const progress = (safe % 7) / 7;
  const nextAt = level * 7;
  return { level, progress, nextAt };
}

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

  const pulse = React.useRef(new Animated.Value(props.reduceMotion ? 0 : 1)).current;

  React.useEffect(() => {
    if (props.reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, props.reduceMotion]);

  const glowOpacity = props.reduceMotion
    ? 0.08
    : (pulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.14] }) as any);

  const glowScale = props.reduceMotion
    ? 1
    : (pulse.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.03] }) as any);

  return (
    <View style={{ width: '32%', minWidth: 108, alignItems: 'center' }}>
      {/* subtle glow */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          width: 98,
          height: 98,
          borderRadius: 49,
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
          backgroundColor: props.accent,
          shadowColor: props.accent,
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        }}
      />

      {/* orb */}
      <View
        style={{
          width: 98,
          height: 98,
          borderRadius: 49,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          overflow: 'hidden',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: withAlpha(props.accent, 0.07),
          }}
        />

        <View style={{ width: 84, height: 84, alignItems: 'center', justifyContent: 'center' }}>
          <ProgressRing
            size={84}
            strokeWidth={9}
            progress={progress}
            valueText={`Lv ${level}`}
            label="Level"
            progressColor={props.accent}
            trackColor={withAlpha(theme.colors.outlineVariant as any, 0.55)}
            accessibilityLabel={`${props.label} level ${level}, ${props.streakCount} day streak`}
          />

          {/* icon chip over the center */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: withAlpha(theme.colors.background as any, 0.55),
              borderWidth: 1,
              borderColor: withAlpha(props.accent, 0.25),
            }}
          >
            <MaterialCommunityIcons name={props.icon} size={22} color={props.accent} />
          </View>
        </View>
      </View>

      <Text
        variant="titleSmall"
        style={{ marginTop: 8, fontWeight: '700', color: theme.colors.onSurface }}
        numberOfLines={1}
      >
        {props.label}
      </Text>

      <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
        {props.streakCount}d • next {nextAt}d
      </Text>

      <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant, opacity: 0.9 }} numberOfLines={1}>
        best {props.longest}d
      </Text>
    </View>
  );
}

export type CelebrateRowProps = {
  reduceMotion?: boolean;
  cardRadius?: number;
  sectionGap?: number;

  mood: { count: number; longest: number };
  sleep: { count: number; longest: number };
  meds: { count: number; longest: number };

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

  const moodAccent = accents?.mood ?? (theme.colors.primary as any);
  const sleepAccent = accents?.sleep ?? (theme.colors.secondary as any);
  const medsAccent = accents?.meds ?? (theme.colors.primary as any);

  return (
    <View style={{ marginBottom: sectionGap }}>
      <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: theme.colors.surfaceVariant }}>
        <Card.Content style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
          <FeatureCardHeader icon="trophy-outline" title="Celebrate" subtitle="Levels over perfection." />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <AchievementOrb
              icon="emoticon-happy-outline"
              label="Mood"
              streakCount={mood.count ?? 0}
              longest={mood.longest ?? 0}
              accent={moodAccent}
              reduceMotion={reduceMotion}
            />

            <AchievementOrb
              icon="sleep"
              label="Sleep"
              streakCount={sleep.count ?? 0}
              longest={sleep.longest ?? 0}
              accent={sleepAccent}
              reduceMotion={reduceMotion}
            />

            <AchievementOrb
              icon="pill"
              label="Meds"
              streakCount={meds.count ?? 0}
              longest={meds.longest ?? 0}
              accent={medsAccent}
              reduceMotion={reduceMotion}
            />
          </View>

          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Keep the streak alive — the next level is just one good day at a time.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}
