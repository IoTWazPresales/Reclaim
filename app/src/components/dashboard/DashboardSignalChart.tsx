/**
 * Home multi-metric signal convergence chart (under insights).
 * Mood · sleep · training (sessions that day) · med adherence — ledger-backed, always-backfill.
 * Continuous last-28 calendar days (honest gaps); mood is the emphasized linker.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, useWindowDimensions, GestureResponderEvent } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Circle, Line, Rect, Defs, ClipPath, G, Text as SvgText } from 'react-native-svg';
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
  chartPointPx,
  chartTickIndices,
  collectContinuousChartDays,
  formatChartDayLabel,
  formatChartTickLabel,
  moodLinkerDays,
} from '@/components/dashboard/signalChartAnalysis';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SERIES_KEYS = SIGNAL_CHART_SERIES.map((s) => s.key);
const CHART_PAD = { padX: 10, padY: 12 } as const;
const AXIS_H = 20;
const PLOT_H = 128;

type SeriesKey = (typeof SIGNAL_CHART_SERIES)[number]['key'];

function SeriesLine({
  d,
  color,
  reduceMotion,
  strokeWidth = 2.2,
}: {
  d: string;
  color: string;
  reduceMotion: boolean;
  strokeWidth?: number;
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
    strokeDashoffset: (1 - progress.value) * 720,
  }));

  if (!d) return null;
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="720"
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

function strokeForSeries(key: string): number {
  return key === 'mood.last' ? 3.4 : 2.1;
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
  const chartH = PLOT_H + AXIS_H;

  const days = useMemo(() => collectContinuousChartDays(28), []);

  const analysis = useMemo(
    () => buildConvergenceAnalysis(seriesQ.data ?? {}, days),
    [seriesQ.data, days],
  );

  const linkerDaySet = useMemo(
    () => new Set(moodLinkerDays(seriesQ.data ?? {}, days)),
    [seriesQ.data, days],
  );

  const tickIdx = useMemo(() => chartTickIndices(days.length), [days.length]);

  const rendered = useMemo(() => {
    const data = seriesQ.data ?? {};
    const out: {
      key: string;
      color: string;
      strokeWidth: number;
      segments: string[];
      aligned: ReturnType<typeof alignSeriesToDays>;
    }[] = [];
    // Draw mood last so the linker sits above other strokes.
    const order = [...SIGNAL_CHART_SERIES].sort((a, b) => {
      if (a.key === 'mood.last') return 1;
      if (b.key === 'mood.last') return -1;
      return 0;
    });
    order.forEach((s) => {
      if (activeKey !== 'all' && activeKey !== s.key) return;
      const index = SIGNAL_CHART_SERIES.findIndex((x) => x.key === s.key);
      const pts = data[s.key] ?? [];
      if (pts.length === 0) return;
      const aligned = alignSeriesToDays(pts, days, s.max);
      out.push({
        key: s.key,
        color: colorForSeries(index, theme),
        strokeWidth: strokeForSeries(s.key),
        segments: buildSegmentedPath(aligned, chartW, PLOT_H, CHART_PAD),
        aligned,
      });
    });
    return out;
  }, [seriesQ.data, activeKey, theme, chartW, days]);

  const moodAligned = useMemo(() => {
    const pts = seriesQ.data?.['mood.last'] ?? [];
    if (pts.length === 0) return [];
    return alignSeriesToDays(pts, days, 5);
  }, [seriesQ.data, days]);

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
    const padX = CHART_PAD.padX;
    const innerW = Math.max(1, chartW - padX * 2);
    const ratio = Math.max(0, Math.min(1, (x - padX) / innerW));
    const idx = Math.round(ratio * (days.length - 1));
    setFocusDayIndex(idx);
  };

  const hasData = rendered.length > 0;
  const moodColor = colorForSeries(0, theme);

  const CardBody = (
    <InformationalCard icon="chart-timeline-variant" marginBottom={0} style={utilitySurface}>
      <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
        Signal convergence
      </Text>
      <Text
        variant="bodySmall"
        style={{ marginTop: 4, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}
      >
        Last 28 days — mood links sleep and training when they share a day. Gaps stay empty; nothing
        is invented.
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
        accessibilityLabel="Signal chart for the last 28 days. Tap a day for figures."
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
            <Defs>
              <ClipPath id="signalPlotClip">
                <Rect x={0} y={0} width={chartW} height={PLOT_H} />
              </ClipPath>
            </Defs>
            {[0.25, 0.5, 0.75].map((y) => {
              const py = CHART_PAD.padY + (1 - y) * (PLOT_H - CHART_PAD.padY * 2);
              return (
                <Line
                  key={y}
                  x1={CHART_PAD.padX}
                  x2={chartW - CHART_PAD.padX}
                  y1={py}
                  y2={py}
                  stroke={theme.colors.outlineVariant}
                  strokeWidth={1}
                  opacity={0.35}
                />
              );
            })}
            {focusDayIndex != null && days.length > 1
              ? (() => {
                  const px = chartPointPx(
                    { x: focusDayIndex / (days.length - 1), y: 0.5 },
                    chartW,
                    PLOT_H,
                    CHART_PAD,
                  );
                  if (!px) return null;
                  return (
                    <Rect
                      x={px.x - 1}
                      y={CHART_PAD.padY}
                      width={2}
                      height={PLOT_H - CHART_PAD.padY * 2}
                      fill={theme.colors.primary}
                      opacity={0.35}
                    />
                  );
                })()
              : null}
            <G clipPath="url(#signalPlotClip)">
              {rendered.map((p) => (
                <React.Fragment key={p.key}>
                  {p.segments.map((seg, i) =>
                    reduceMotion ? (
                      <Path
                        key={`${p.key}-${i}`}
                        d={seg}
                        stroke={p.color}
                        strokeWidth={p.strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.95}
                      />
                    ) : (
                      <SeriesLine
                        key={`${p.key}-${i}`}
                        d={seg}
                        color={p.color}
                        strokeWidth={p.strokeWidth}
                        reduceMotion={false}
                      />
                    ),
                  )}
                  {p.aligned
                    .filter((a) => a.y != null)
                    .slice(-1)
                    .map((last) => {
                      const px = chartPointPx(last, chartW, PLOT_H, CHART_PAD);
                      if (!px) return null;
                      return (
                        <Circle
                          key={`${p.key}-end`}
                          cx={px.x}
                          cy={px.y}
                          r={p.key === 'mood.last' ? 4.5 : 3.5}
                          fill={p.color}
                        />
                      );
                    })}
                </React.Fragment>
              ))}
              {(activeKey === 'all' || activeKey === 'mood.last') &&
                moodAligned
                  .filter((a) => a.y != null && linkerDaySet.has(a.dayDate))
                  .map((a) => {
                    const px = chartPointPx(a, chartW, PLOT_H, CHART_PAD);
                    if (!px) return null;
                    return (
                      <Circle
                        key={`link-${a.dayDate}`}
                        cx={px.x}
                        cy={px.y}
                        r={5.5}
                        fill="none"
                        stroke={moodColor}
                        strokeWidth={1.5}
                        opacity={0.85}
                      />
                    );
                  })}
            </G>
            {tickIdx.map((i) => {
              const day = days[i];
              if (!day) return null;
              const x =
                days.length === 1
                  ? chartW / 2
                  : CHART_PAD.padX + (i / (days.length - 1)) * (chartW - CHART_PAD.padX * 2);
              const anchor = i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle';
              return (
                <SvgText
                  key={`tick-${day}`}
                  x={x}
                  y={PLOT_H + 14}
                  fill={theme.colors.onSurfaceVariant}
                  fontSize={10}
                  textAnchor={anchor}
                >
                  {formatChartTickLabel(day)}
                </SvgText>
              );
            })}
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
            {linkerDaySet.has(focusDay) ? ' · mood linked' : ''}
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
