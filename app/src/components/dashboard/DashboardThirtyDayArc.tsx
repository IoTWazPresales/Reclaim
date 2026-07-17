/**
 * Phase 5.5 — read-only 30-day arc from existing mood + sleep history (no new metrics/storage).
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Svg, { Defs, LinearGradient, Stop } from 'react-native-svg';

import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { InformationalCard } from '@/components/ui';
import { formatSvgNum, isValidPathD } from '@/lib/svg/path';
import { SafeSvgPath } from '@/lib/svg/SafeSvgPath';
import { useAppTheme } from '@/theme';
import { RECLAIM_CHROME, reclaimChromeElevation } from '@/theme';

type MoodPoint = { created_at?: string; rating?: number | null };
type SleepRow = { start_time?: string; end_time?: string; duration_minutes?: number | null };

export type DashboardThirtyDayArcProps = {
  moodCheckins: MoodPoint[];
  sleepSessions: SleepRow[];
  reduceMotion?: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function lastNDayKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    keys.push(dayKey(d));
  }
  return keys;
}

function moodSeriesByDay(checkins: MoodPoint[], keys: string[]): number[] {
  const byDay = new Map<string, number[]>();
  for (const c of checkins) {
    if (!c.created_at || c.rating == null) continue;
    const k = dayKey(new Date(c.created_at));
    const rating = c.rating > 5 ? c.rating / 2 : c.rating;
    const arr = byDay.get(k) ?? [];
    arr.push(rating);
    byDay.set(k, arr);
  }
  return keys.map((k) => {
    const vals = byDay.get(k);
    if (!vals?.length) return NaN;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });
}

function sleepHoursByDay(sessions: SleepRow[], keys: string[]): number[] {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    if (!s.start_time) continue;
    const k = dayKey(new Date(s.start_time));
    let mins = s.duration_minutes;
    if (mins == null && s.end_time) {
      mins = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000;
    }
    if (mins == null || !Number.isFinite(mins)) continue;
    byDay.set(k, Math.max(byDay.get(k) ?? 0, mins / 60));
  }
  return keys.map((k) => byDay.get(k) ?? NaN);
}

function sparkPath(values: number[], width: number, height: number, padY = 4): string {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return '';
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = Math.max(0.01, max - min);
  const step = width / Math.max(1, values.length - 1);
  let d = '';
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const x = formatSvgNum(i * step);
    const y = formatSvgNum(padY + (height - padY * 2) * (1 - (v - min) / span));
    d += d ? ` L ${x} ${y}` : `M ${x} ${y}`;
  });
  return d;
}

function countMoodDays(checkins: MoodPoint[], startMs: number, endMs: number): number {
  const days = new Set<string>();
  for (const c of checkins) {
    if (!c.created_at) continue;
    const t = new Date(c.created_at).getTime();
    if (t >= startMs && t < endMs) days.add(dayKey(new Date(c.created_at)));
  }
  return days.size;
}

export function DashboardThirtyDayArc({ moodCheckins, sleepSessions, reduceMotion = false }: DashboardThirtyDayArcProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const chrome = reclaimChromeElevation(appTheme, 'quiet');
  const keys30 = useMemo(() => lastNDayKeys(30), []);
  const moodSeries = useMemo(() => moodSeriesByDay(moodCheckins, keys30), [moodCheckins, keys30]);
  const sleepSeries = useMemo(() => sleepHoursByDay(sleepSessions, keys30), [sleepSessions, keys30]);

  const moodDays = moodSeries.filter((v) => Number.isFinite(v)).length;
  const sleepNights = sleepSeries.filter((v) => Number.isFinite(v)).length;

  const now = Date.now();
  const recentMoodDays = countMoodDays(moodCheckins, now - 30 * DAY_MS, now);
  const priorMoodDays = countMoodDays(moodCheckins, now - 60 * DAY_MS, now - 30 * DAY_MS);
  const moodDelta = recentMoodDays - priorMoodDays;

  const humanLine = useMemo(() => {
    if (moodDays === 0 && sleepNights === 0) {
      return 'As you log mood and sleep, your last 30 days will show up here — gently, without pressure.';
    }
    if (moodDelta > 0) {
      return `${moodDelta} more mood check-in day${moodDelta === 1 ? '' : 's'} than the month before.`;
    }
    if (moodDelta < 0 && priorMoodDays > 0) {
      return 'A quieter month — and that is allowed. Small logs still count.';
    }
    if (moodDays > 0) {
      return `${moodDays} day${moodDays === 1 ? '' : 's'} of mood logged this month.`;
    }
    return `${sleepNights} night${sleepNights === 1 ? '' : 's'} of sleep tracked this month.`;
  }, [moodDays, sleepNights, moodDelta, priorMoodDays]);

  const moodPath = sparkPath(moodSeries, 120, 36);
  const sleepPath = sparkPath(sleepSeries, 120, 36);
  // Sparklines are static SVG (no continuous animation); reduce-motion still prefers text-only.
  const hasSpark = !reduceMotion && (isValidPathD(moodPath) || isValidPathD(sleepPath));

  return (
    <InformationalCard marginBottom={0} style={{ borderRadius: RECLAIM_CHROME.cardRadius, ...chrome }}>
      <FeatureCardHeader icon="chart-timeline-variant" title="Your last 30 days" subtitle="A quiet read on your rhythm." />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 10, lineHeight: 21 }}>
        {humanLine}
      </Text>
      {hasSpark ? (
        <View style={styles.sparkRow}>
          {isValidPathD(moodPath) ? (
            <View style={styles.sparkBlock}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
                Mood
              </Text>
              <Svg width={120} height={36} viewBox="0 0 120 36">
                <Defs>
                  <LinearGradient id="arcMood" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={appTheme.domainAccents.mood} stopOpacity={0.35} />
                    <Stop offset="1" stopColor={appTheme.domainAccents.mood} stopOpacity={0.95} />
                  </LinearGradient>
                </Defs>
                <SafeSvgPath source="DashboardThirtyDayArc.mood" d={moodPath} fill="none" stroke="url(#arcMood)" strokeWidth={2.2} strokeLinecap="round" />
              </Svg>
            </View>
          ) : null}
          {isValidPathD(sleepPath) ? (
            <View style={styles.sparkBlock}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
                Sleep
              </Text>
              <Svg width={120} height={36} viewBox="0 0 120 36">
                <Defs>
                  <LinearGradient id="arcSleep" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={appTheme.domainAccents.sleep} stopOpacity={0.35} />
                    <Stop offset="1" stopColor={appTheme.domainAccents.sleep} stopOpacity={0.95} />
                  </LinearGradient>
                </Defs>
                <SafeSvgPath source="DashboardThirtyDayArc.sleep" d={sleepPath} fill="none" stroke="url(#arcSleep)" strokeWidth={2.2} strokeLinecap="round" />
              </Svg>
            </View>
          ) : null}
        </View>
      ) : null}
    </InformationalCard>
  );
}

const styles = StyleSheet.create({
  sparkRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  sparkBlock: {
    minWidth: 120,
  },
});
