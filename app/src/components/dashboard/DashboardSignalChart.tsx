/**
 * Home multi-metric signal convergence chart (under insights).
 * Reads Signal Ledger only — expects backfill + live snapshots.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { useAuth } from '@/providers/AuthProvider';
import { InformationalCard } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { reclaimUtilityCardSurface } from '@/theme/reclaimVisualLanguage';
import { readSignalLedgerMultiSeries } from '@/lib/localData/signalLedgerRepository';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SERIES = [
  { key: 'mood.last', label: 'Mood', colorKey: 'primary' as const, max: 5 },
  { key: 'sleep.lastNight.hours', label: 'Sleep', colorKey: 'tertiary' as const, max: 10 },
  { key: 'training.weeklySessionCount', label: 'Training', colorKey: 'secondary' as const, max: 7 },
] as const;

function normalize(value: number, max: number): number {
  if (!Number.isFinite(value) || max <= 0) return 0;
  return Math.max(0, Math.min(1, value / max));
}

function buildPath(
  points: { x: number; y: number }[],
  width: number,
  height: number,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0]!;
    return `M ${p.x * width} ${height - p.y * height}`;
  }
  let d = `M ${points[0]!.x * width} ${height - points[0]!.y * height}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    d += ` L ${p.x * width} ${height - p.y * height}`;
  }
  return d;
}

function SeriesLine({
  d,
  color,
  reduceMotion,
}: {
  d: string;
  color: string;
  reduceMotion: boolean;
}) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reduceMotion ? 0 : 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [d, progress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - progress.value) * 400,
  }));

  if (!d) return null;
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={2.5}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="400"
      animatedProps={animatedProps}
      opacity={0.95}
    />
  );
}

export function DashboardSignalChart() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { width: winW } = useWindowDimensions();
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme), [appTheme]);
  const [activeKey, setActiveKey] = useState<(typeof SERIES)[number]['key'] | 'all'>('all');

  const seriesQ = useQuery({
    queryKey: ['signal-ledger:home-chart', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return {};
      return readSignalLedgerMultiSeries(
        userId,
        SERIES.map((s) => s.key),
        21,
      );
    },
    staleTime: 60_000,
  });

  const chartW = Math.min(winW - 64, 420);
  const chartH = 120;

  const paths = useMemo(() => {
    const data = seriesQ.data ?? {};
    const out: { key: string; color: string; d: string; last?: { x: number; y: number; value: number } }[] =
      [];
    for (const s of SERIES) {
      if (activeKey !== 'all' && activeKey !== s.key) continue;
      const pts = data[s.key] ?? [];
      if (pts.length === 0) continue;
      const color =
        s.colorKey === 'primary'
          ? theme.colors.primary
          : s.colorKey === 'secondary'
            ? theme.colors.secondary
            : theme.colors.tertiary;
      const mapped = pts.map((p, i) => ({
        x: pts.length === 1 ? 0.5 : i / (pts.length - 1),
        y: normalize(p.value, s.max),
        value: p.value,
      }));
      out.push({
        key: s.key,
        color,
        d: buildPath(mapped, chartW, chartH),
        last: mapped[mapped.length - 1],
      });
    }
    return out;
  }, [seriesQ.data, activeKey, theme.colors, chartW, chartH]);

  const hasData = paths.length > 0;

  const CardBody = (
    <InformationalCard icon="chart-timeline-variant" marginBottom={0} style={utilitySurface}>
      <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
        Signal convergence
      </Text>
      <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
        Mood, sleep, and training from your history — updated as you live in Reclaim.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Pressable
          onPress={() => setActiveKey('all')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeKey === 'all' }}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor:
              activeKey === 'all' ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
          }}
        >
          <Text variant="labelSmall" style={{ color: theme.colors.onSurface }}>
            All
          </Text>
        </Pressable>
        {SERIES.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => setActiveKey(s.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeKey === s.key }}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor:
                activeKey === s.key ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
            }}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.onSurface }}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ marginTop: 12, height: chartH }}>
        {seriesQ.isLoading ? (
          <ActivityIndicator />
        ) : !hasData ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
            Logging mood, sleep, or a training session will grow this chart. Nothing is invented.
          </Text>
        ) : (
          <Svg width={chartW} height={chartH}>
            <Defs>
              <LinearGradient id="sigFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="0.18" />
                <Stop offset="1" stopColor={theme.colors.primary} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((y) => (
              <Line
                key={y}
                x1={0}
                x2={chartW}
                y1={chartH * y}
                y2={chartH * y}
                stroke={theme.colors.outlineVariant}
                strokeWidth={1}
                opacity={0.35}
              />
            ))}
            {paths.map((p) => (
              <React.Fragment key={p.key}>
                <SeriesLine d={p.d} color={p.color} reduceMotion={!!reduceMotion} />
                {p.last ? (
                  <Circle
                    cx={p.last.x * chartW}
                    cy={chartH - p.last.y * chartH}
                    r={4}
                    fill={p.color}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </Svg>
        )}
      </View>
    </InformationalCard>
  );

  if (reduceMotion) return CardBody;
  return (
    <Animated.View entering={FadeInDown.duration(480).springify().damping(18)}>
      {CardBody}
    </Animated.View>
  );
}
