/**
 * Home multi-metric signal convergence chart (under insights).
 * Mood · sleep · training · med adherence — continuous last-28 days; mood is the linker.
 * Plot uses View overflow clipping (RN ClipPath is unreliable on Android) + axis spines.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, useWindowDimensions, GestureResponderEvent } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
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
/** Inset inside the plot so thick strokes + end dots never spill past the card. */
const PLOT_INSET = { padX: 14, padY: 14 } as const;
const Y_LABEL_W = 30;
const X_AXIS_H = 22;
const PLOT_H = 148;

type SeriesKey = (typeof SIGNAL_CHART_SERIES)[number]['key'];

function SeriesLine({
  d,
  color,
  reduceMotion,
  strokeWidth = 2,
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
      opacity={0.92}
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
  return key === 'mood.last' ? 3.0 : 1.9;
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

  const chartOuterW = Math.min(winW - 64, 420);
  const plotW = Math.max(120, chartOuterW - Y_LABEL_W);
  const chartH = PLOT_H + X_AXIS_H;

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
        segments: buildSegmentedPath(aligned, plotW, PLOT_H, PLOT_INSET),
        aligned,
      });
    });
    return out;
  }, [seriesQ.data, activeKey, theme, plotW, days]);

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
    const x = e.nativeEvent.locationX - Y_LABEL_W;
    const innerW = Math.max(1, plotW - PLOT_INSET.padX * 2);
    const ratio = Math.max(0, Math.min(1, (x - PLOT_INSET.padX) / innerW));
    const idx = Math.round(ratio * (days.length - 1));
    setFocusDayIndex(idx);
  };

  const hasData = rendered.length > 0;
  const moodColor = colorForSeries(0, theme);
  const axisColor = theme.colors.outline;
  const gridColor = theme.colors.outlineVariant;

  const yTicks = [
    { t: 1, label: 'High' },
    { t: 0.5, label: 'Mid' },
    { t: 0, label: 'Low' },
  ];

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
        style={{ marginTop: 12, height: chartH, overflow: 'hidden' }}
      >
        {seriesQ.isLoading ? (
          <ActivityIndicator />
        ) : !hasData ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
            Logging mood, sleep, training, or meds will grow this chart. Nothing is invented.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', height: chartH }}>
            {/* Y labels */}
            <View style={{ width: Y_LABEL_W, height: PLOT_H, justifyContent: 'space-between' }}>
              {yTicks.map((yt) => (
                <Text
                  key={yt.label}
                  variant="labelSmall"
                  style={{
                    fontSize: 9,
                    color: theme.colors.onSurfaceVariant,
                    textAlign: 'right',
                    paddingRight: 4,
                  }}
                >
                  {yt.label}
                </Text>
              ))}
            </View>

            <View style={{ width: plotW, overflow: 'hidden' }}>
              <View style={{ height: PLOT_H, overflow: 'hidden' }}>
                <Svg width={plotW} height={PLOT_H}>
                  {/* Grid */}
                  {yTicks.map((yt) => {
                    const py =
                      PLOT_INSET.padY + (1 - yt.t) * (PLOT_H - PLOT_INSET.padY * 2);
                    return (
                      <Line
                        key={`g-${yt.label}`}
                        x1={PLOT_INSET.padX}
                        x2={plotW - PLOT_INSET.padX}
                        y1={py}
                        y2={py}
                        stroke={gridColor}
                        strokeWidth={1}
                        opacity={0.4}
                      />
                    );
                  })}
                  {/* Vertical guide ticks */}
                  {tickIdx.map((i) => {
                    const x =
                      days.length === 1
                        ? plotW / 2
                        : PLOT_INSET.padX +
                          (i / (days.length - 1)) * (plotW - PLOT_INSET.padX * 2);
                    return (
                      <Line
                        key={`vx-${i}`}
                        x1={x}
                        x2={x}
                        y1={PLOT_INSET.padY}
                        y2={PLOT_H - PLOT_INSET.padY}
                        stroke={gridColor}
                        strokeWidth={1}
                        opacity={0.22}
                      />
                    );
                  })}
                  {/* Axis spines */}
                  <Line
                    x1={PLOT_INSET.padX}
                    x2={PLOT_INSET.padX}
                    y1={PLOT_INSET.padY}
                    y2={PLOT_H - PLOT_INSET.padY}
                    stroke={axisColor}
                    strokeWidth={1.25}
                    opacity={0.7}
                  />
                  <Line
                    x1={PLOT_INSET.padX}
                    x2={plotW - PLOT_INSET.padX}
                    y1={PLOT_H - PLOT_INSET.padY}
                    y2={PLOT_H - PLOT_INSET.padY}
                    stroke={axisColor}
                    strokeWidth={1.25}
                    opacity={0.7}
                  />
                  {focusDayIndex != null && days.length > 1
                    ? (() => {
                        const px = chartPointPx(
                          { x: focusDayIndex / (days.length - 1), y: 0.5 },
                          plotW,
                          PLOT_H,
                          PLOT_INSET,
                        );
                        if (!px) return null;
                        return (
                          <Rect
                            x={px.x - 1}
                            y={PLOT_INSET.padY}
                            width={2}
                            height={PLOT_H - PLOT_INSET.padY * 2}
                            fill={theme.colors.primary}
                            opacity={0.35}
                          />
                        );
                      })()
                    : null}
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
                            opacity={0.92}
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
                          const px = chartPointPx(last, plotW, PLOT_H, PLOT_INSET);
                          if (!px) return null;
                          return (
                            <Circle
                              key={`${p.key}-end`}
                              cx={px.x}
                              cy={px.y}
                              r={p.key === 'mood.last' ? 3.5 : 2.8}
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
                        const px = chartPointPx(a, plotW, PLOT_H, PLOT_INSET);
                        if (!px) return null;
                        return (
                          <Circle
                            key={`link-${a.dayDate}`}
                            cx={px.x}
                            cy={px.y}
                            r={4.5}
                            fill="none"
                            stroke={moodColor}
                            strokeWidth={1.4}
                            opacity={0.85}
                          />
                        );
                      })}
                </Svg>
              </View>

              {/* X labels */}
              <Svg width={plotW} height={X_AXIS_H}>
                {tickIdx.map((i) => {
                  const day = days[i];
                  if (!day) return null;
                  const x =
                    days.length === 1
                      ? plotW / 2
                      : PLOT_INSET.padX +
                        (i / (days.length - 1)) * (plotW - PLOT_INSET.padX * 2);
                  const anchor = i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle';
                  return (
                    <SvgText
                      key={`tick-${day}`}
                      x={x}
                      y={14}
                      fill={theme.colors.onSurfaceVariant}
                      fontSize={10}
                      textAnchor={anchor}
                    >
                      {formatChartTickLabel(day)}
                    </SvgText>
                  );
                })}
              </Svg>
            </View>
          </View>
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
