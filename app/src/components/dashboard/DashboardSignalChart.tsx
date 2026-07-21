/**
 * Home multi-metric signal convergence chart (under insights).
 * Mood · sleep · training (sessions that day) · med adherence — ledger-backed, always-backfill.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, useWindowDimensions, GestureResponderEvent } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
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
import {
  SIGNAL_CHART_SERIES,
  alignSeriesToDays,
  buildConvergenceAnalysis,
  buildSegmentedPath,
  collectChartDays,
  formatChartDayLabel,
} from '@/components/dashboard/signalChartAnalysis';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SERIES_KEYS = SIGNAL_CHART_SERIES.map((s) => s.key);

type SeriesKey = (typeof SIGNAL_CHART_SERIES)[number]['key'];

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
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: reduceMotion ? 0 : 850,
      easing: Easing.out(Easing.cubic),
    });
  }, [d, progress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - progress.value) * 520,
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
      strokeDasharray="520"
      animatedProps={animatedProps}
      opacity={0.95}
    />
  );
}

function colorForSeries(
  index: number,
  theme: { colors: { primary: string; secondary: string; tertiary: string; error: string } },
): string {
  const palette = [
    theme.colors.primary,
    theme.colors.tertiary,
    theme.colors.secondary,
    theme.colors.error,
  ];
  return palette[index % palette.length]!;
}

export function DashboardSignalChart() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { width: winW } = useWindowDimensions();
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme), [appTheme]);
  const [activeKey, setActiveKey] = useState<SeriesKey | 'all'>('all');
  const [focusDayIndex, setFocusDayIndex] = useState<number | null>(null);

  const factorKeys = SERIES_KEYS;

  const seriesQ = useQuery({
    queryKey: ['signal-ledger:home-chart', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return {};
      return readSignalLedgerMultiSeries(userId, SERIES_KEYS, 28);
    },
    staleTime: 60_000,
  });

  const chartW = Math.min(winW - 64, 420);
  const chartH = 140;

  const days = useMemo(
    () => collectChartDays(seriesQ.data ?? {}, factorKeys),
    [seriesQ.data, factorKeys],
  );

  const analysis = useMemo(
    () => buildConvergenceAnalysis(seriesQ.data ?? {}, days),
    [seriesQ.data, days],
  );

  const rendered = useMemo(() => {
    const data = seriesQ.data ?? {};
    const out: {
      key: string;
      color: string;
      segments: string[];
      aligned: ReturnType<typeof alignSeriesToDays>;
    }[] = [];
    SIGNAL_CHART_SERIES.forEach((s, index) => {
      if (activeKey !== 'all' && activeKey !== s.key) return;
      const pts = data[s.key] ?? [];
      if (pts.length === 0) return;
      const aligned = alignSeriesToDays(pts, days, s.max);
      out.push({
        key: s.key,
        color: colorForSeries(index, theme),
        segments: buildSegmentedPath(aligned, chartW, chartH),
        aligned,
      });
    });
    return out;
  }, [seriesQ.data, activeKey, theme, chartW, chartH, days]);

  const focusDay = focusDayIndex != null ? days[focusDayIndex] ?? null : null;
  const focusFigures = useMemo(() => {
    if (!focusDay || !seriesQ.data) return [];
    return SIGNAL_CHART_SERIES.map((s, index) => {
      const pt = (seriesQ.data[s.key] ?? []).find((p) => p.dayDate === focusDay);
      if (!pt) return null;
      return {
        label: s.label,
        text: s.format(pt.value),
        color: colorForSeries(index, theme),
      };
    }).filter(Boolean) as { label: string; text: string; color: string }[];
  }, [focusDay, seriesQ.data, theme]);

  const onChartPress = (e: GestureResponderEvent) => {
    if (days.length === 0) return;
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / chartW));
    const idx = Math.round(ratio * (days.length - 1));
    setFocusDayIndex(idx);
  };

  const hasData = rendered.length > 0;

  const CardBody = (
    <InformationalCard icon="chart-timeline-variant" marginBottom={0} style={utilitySurface}>
      <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
        Signal convergence
      </Text>
      <Text
        variant="bodySmall"
        style={{ marginTop: 4, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}
      >
        Mood, sleep, training, and med adherence from your history — one shared timeline.
      </Text>

      <View
        style={{
          marginTop: 10,
          paddingVertical: 8,
          paddingHorizontal: 10,
          borderRadius: 12,
          backgroundColor: theme.colors.surfaceVariant,
        }}
      >
        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, lineHeight: 18 }}>
          {analysis}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Pressable
          onPress={() => {
            setActiveKey('all');
            setFocusDayIndex(null);
          }}
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
        {SIGNAL_CHART_SERIES.map((s, index) => (
          <Pressable
            key={s.key}
            onPress={() => {
              setActiveKey(s.key);
              setFocusDayIndex(null);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: activeKey === s.key }}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor:
                activeKey === s.key ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
              borderLeftWidth: 3,
              borderLeftColor: colorForSeries(index, theme),
            }}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.onSurface }}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={onChartPress}
        accessibilityRole="adjustable"
        accessibilityLabel="Signal chart. Tap a day for figures."
        style={{ marginTop: 12, height: chartH }}
      >
        {seriesQ.isLoading ? (
          <ActivityIndicator />
        ) : !hasData ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
            Logging mood, sleep, training, or meds will grow this chart. Nothing is invented.
          </Text>
        ) : (
          <Svg width={chartW} height={chartH}>
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
            {focusDayIndex != null && days.length > 1 ? (
              <Rect
                x={
                  (focusDayIndex / (days.length - 1)) * chartW - 1
                }
                y={0}
                width={2}
                height={chartH}
                fill={theme.colors.primary}
                opacity={0.35}
              />
            ) : null}
            {rendered.map((p) => (
              <React.Fragment key={p.key}>
                {p.segments.map((seg, i) =>
                  reduceMotion ? (
                    <Path
                      key={`${p.key}-${i}`}
                      d={seg}
                      stroke={p.color}
                      strokeWidth={2.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.95}
                    />
                  ) : (
                    <SeriesLine key={`${p.key}-${i}`} d={seg} color={p.color} reduceMotion={false} />
                  ),
                )}
                {p.aligned
                  .filter((a) => a.y != null)
                  .slice(-1)
                  .map((last) => (
                    <Circle
                      key={`${p.key}-end`}
                      cx={last.x * chartW}
                      cy={chartH - (last.y ?? 0) * chartH}
                      r={4}
                      fill={p.color}
                    />
                  ))}
              </React.Fragment>
            ))}
          </Svg>
        )}
      </Pressable>

      {focusDay && focusFigures.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          <Text
            variant="labelMedium"
            style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: 4 }}
          >
            {formatChartDayLabel(focusDay)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {focusFigures.map((f) => (
              <View
                key={f.label}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderLeftWidth: 3,
                  borderLeftColor: f.color,
                }}
              >
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {f.label}
                </Text>
                <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                  {f.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : hasData ? (
        <Text
          variant="labelSmall"
          style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}
        >
          Tap the chart to scrub a day
        </Text>
      ) : null}
    </InformationalCard>
  );

  if (reduceMotion) return CardBody;
  return (
    <Animated.View entering={FadeInDown.duration(480).springify().damping(18)}>
      {CardBody}
    </Animated.View>
  );
}
