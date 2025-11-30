import React, { useMemo } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Text, useTheme, Card, Button } from 'react-native-paper';
import { listMeditations, listMoodCheckins } from '@/lib/api';
import { getMeditationById } from '@/lib/meditations';
import MedsAdherenceCard from '@/components/MedsAdherenceCard';
import { getLastSyncISO, syncAll } from '@/lib/sync';
import { AppScreen, AppCard } from '@/components/ui';
import { useAppTheme } from '@/theme';

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function dayKey(d: Date | string) {
  const t = typeof d === 'string' ? new Date(d) : d;
  const x = new Date(t);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export default function AnalyticsScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const moodQ = useQuery({
    queryKey: ['mood_checkins:all'],
    queryFn: () => listMoodCheckins(1000),
  });
  const medQ = useQuery({
    queryKey: ['meditations:all'],
    queryFn: () => listMeditations(),
  });

  // Last sync (lazy, non-reactive pull on mount)
  const lastSyncQ = useQuery({
    queryKey: ['sync:last'],
    queryFn: getLastSyncISO,
  });

  const loading = moodQ.isLoading || medQ.isLoading;
  const error = moodQ.error || medQ.error;

  const {
    avg7,
    avg30,
    countMed7,
    countMed30,
    moodOnMeditationDays,
    moodOnNonMeditationDays,
    commonTypes7,
    moodSeries14,
    medSeries14,
  } = useMemo(() => {
    const res = {
      avg7: null as number | null,
      avg30: null as number | null,
      countMed7: 0,
      countMed30: 0,
      moodOnMeditationDays: null as number | null,
      moodOnNonMedititationDays: null as number | null, // not used directly; keep shape
      moodOnNonMeditationDays: null as number | null,
      commonTypes7: [] as Array<{ name: string; count: number }>,
      moodSeries14: [] as number[], // daily avg mood (last 14 days, oldest→newest)
      medSeries14: [] as number[],  // sessions per day (last 14 days, oldest→newest)
    };

    const moods = moodQ.data ?? [];
    const meds  = medQ.data  ?? [];

    const start7   = daysAgo(6);     // inclusive window (today..6 days ago)
    const start14  = daysAgo(13);
    const start30  = daysAgo(29);

    const mean = (xs: number[]) => xs.length ? Math.round((xs.reduce((a,b)=>a+b,0)/xs.length)*10)/10 : null;

    // Mood windows
    const weekMoods  = moods.filter(m => new Date(m.created_at) >= start7);
    const monthMoods = moods.filter(m => new Date(m.created_at) >= start30);
    res.avg7  = mean(weekMoods.map(m => m.mood ?? m.rating));
    res.avg30 = mean(monthMoods.map(m => m.mood ?? m.rating));

    // Med windows
    const weekMeds  = meds.filter(s => new Date(s.startTime) >= start7);
    const monthMeds = meds.filter(s => new Date(s.startTime) >= start30);
    res.countMed7  = weekMeds.length;
    res.countMed30 = monthMeds.length;

    // Common types (7d)
    const typeCounts = new Map<string, number>();
    for (const s of weekMeds) {
      const name = s.meditationType ? (getMeditationById(s.meditationType)?.name ?? s.meditationType) : 'Meditation';
      typeCounts.set(name, (typeCounts.get(name) ?? 0) + 1);
    }
    res.commonTypes7 = Array.from(typeCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a,b)=> b.count - a.count)
      .slice(0, 3);

    // Correlation: average mood on days with/without meditation (30d)
    const medDays = new Set(monthMeds.map(s => dayKey(s.startTime)));
    const moodsByDay = new Map<string, MoodEntry[]>();
    for (const m of monthMoods) {
      const k = dayKey(m.created_at);
      const arr = moodsByDay.get(k) ?? [];
      arr.push(m);
      moodsByDay.set(k, arr);
    }

    const moodOnMed: number[] = [];
    const moodOff: number[]   = [];
    for (const [k, arr] of moodsByDay) {
      const avg = mean(arr.map(x => x.rating));
      if (avg == null) continue;
      if (medDays.has(k)) moodOnMed.push(avg); else moodOff.push(avg);
    }
    res.moodOnMeditationDays    = mean(moodOnMed);
    res.moodOnNonMeditationDays = mean(moodOff);

    // Sparkline source (last 14 days)
    const days: string[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(dayKey(d));
    }
    const moodByDay = new Map<string, number[]>();
    for (const m of moods) {
      const k = dayKey(m.created_at);
      const arr = moodByDay.get(k) ?? [];
      arr.push(m.mood ?? (m as any).rating);
      moodByDay.set(k, arr);
    }
    res.moodSeries14 = days.map(k => {
      const xs = moodByDay.get(k) ?? [];
      return xs.length ? Math.round((xs.reduce((a,b)=>a+b,0)/xs.length)*10)/10 : 0;
    });

    const medCountByDay = new Map<string, number>();
    for (const s of meds) {
      const k = dayKey(s.startTime);
      if (new Date(k) < start14) continue;
      medCountByDay.set(k, (medCountByDay.get(k) ?? 0) + 1);
    }
    res.medSeries14 = days.map(k => medCountByDay.get(k) ?? 0);

    return res;
  }, [moodQ.data, medQ.data]);

  async function onSyncNow() {
    try {
      const { moodUpserted, meditationUpserted } = await syncAll();
      Alert.alert('Synced', `Mood: ${moodUpserted}\nMeditations: ${meditationUpserted}`);
    } catch (e: any) {
      Alert.alert('Sync failed', e?.message ?? 'Unknown error');
    }
  }

  return (
    <AppScreen padding="lg">

      {/* Sync status */}
      <AppCard>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Sync</Text>
          <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, opacity: 0.8, color: theme.colors.onSurface }}>
            Last sync: {lastSyncQ.data ? new Date(lastSyncQ.data).toLocaleString() : '—'}
          </Text>
          <Button
            mode="contained"
            onPress={onSyncNow}
            style={{ marginTop: appTheme.spacing.sm, alignSelf: 'flex-start' }}
          >
            Sync now
          </Button>
        </Card.Content>
      </AppCard>

      {loading && (
        <AppCard>
          <Card.Content>
            <ActivityIndicator color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.sm, opacity: 0.7, color: theme.colors.onSurface }}>Loading…</Text>
          </Card.Content>
        </AppCard>
      )}

      {error && (
        <AppCard style={{ backgroundColor: theme.colors.errorContainer }}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer }}>
              {(error as any)?.message ?? 'Failed to load analytics.'}
            </Text>
          </Card.Content>
        </AppCard>
      )}

      {!loading && !error && (
        <>
          {/* Mood Summary */}
          <AppCard>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Mood</Text>
              {moodSeries14.length === 0 || moodSeries14.every(v => v === 0) ? (
                <View style={{ paddingVertical: appTheme.spacing.xxl, alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>No mood data yet</Text>
                  <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.xs, opacity: 0.7, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    Start logging your mood to see insights here
                  </Text>
                </View>
              ) : (
                <>
                  <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, color: theme.colors.onSurface }}>7-day average: {avg7 ?? '—'}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>30-day average: {avg30 ?? '—'}</Text>

                  {/* Sparkline: last 14 days (avg per day) */}
                  <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.sm, opacity: 0.7, color: theme.colors.onSurface }}>Last 14 days</Text>
                  <View style={{ overflow: 'hidden', width: '100%' }}>
                    <MiniBarSparkline data={moodSeries14} maxValue={10} height={120} barWidth={20} gap={6} theme={theme} />
                  </View>
                </>
              )}
            </Card.Content>
          </AppCard>

          {/* Meditation Summary */}
          <AppCard>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Meditation</Text>
              {medSeries14.length === 0 || medSeries14.every(v => v === 0) ? (
                <View style={{ paddingVertical: appTheme.spacing.xxl, alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>No meditation data yet</Text>
                  <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.xs, opacity: 0.7, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    Complete mindfulness sessions to see insights here
                  </Text>
                </View>
              ) : (
                <>
                  <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, color: theme.colors.onSurface }}>Past 7 days: {countMed7}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Past 30 days: {countMed30}</Text>
                  {commonTypes7.length > 0 && (
                    <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, opacity: 0.8, color: theme.colors.onSurface }}>
                      Most common (7d): {commonTypes7.map(t => `${t.name} (${t.count})`).join(', ')}
                    </Text>
                  )}

                  {/* Sparkline: last 14 days (sessions per day) */}
                  <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.sm, opacity: 0.7, color: theme.colors.onSurface }}>Last 14 days</Text>
                  <View style={{ overflow: 'hidden', width: '100%' }}>
                    <MiniBarSparkline data={medSeries14} height={36} theme={theme} />
                  </View>
                </>
              )}
            </Card.Content>
          </AppCard>

          {/* Medication Adherence */}
          <MedsAdherenceCard />

          {/* Correlation Insight */}
          <AppCard>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Mood ↔︎ Meditation</Text>
              <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, color: theme.colors.onSurface }}>
                Avg mood on days with meditation: {moodOnMeditationDays ?? '—'}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                Avg mood on days without meditation: {moodOnNonMeditationDays ?? '—'}
              </Text>
              {moodOnMeditationDays != null && moodOnNonMeditationDays != null && (
                <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, fontWeight: '600', color: theme.colors.onSurface }}>
                  Difference: {Math.round(((moodOnMeditationDays - moodOnNonMeditationDays) * 10)) / 10}
                </Text>
              )}
              <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.xs, opacity: 0.6, color: theme.colors.onSurface }}>
                Simple descriptive comparison over the last 30 days (same-day averages).
              </Text>
            </Card.Content>
          </AppCard>
        </>
      )}
    </AppScreen>
  );
}

/** ─────────────────────────────────────────────────────────────
 * MiniBarSparkline — tiny bar sparkline built with Views.
 * - data: numbers (oldest→newest)
 * - maxValue: optional clamp for scaling (defaults to max in data or 1)
 * - height: pixel height of the chart (default 36)
 * - barWidth: width of each bar (default 8)
 * - gap: spacing between bars (default 2)
 * ───────────────────────────────────────────────────────────── */
function MiniBarSparkline({
  data,
  maxValue,
  height = 36,
  barWidth = 8,
  gap = 2,
  theme,
}: {
  data: number[];
  maxValue?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  theme?: ReturnType<typeof useTheme>;
}) {
  const sparklineTheme = useTheme();
  const t = theme || sparklineTheme;
  const max = Math.max(1, maxValue ?? (data.length ? Math.max(...data) : 1));
  const scale = (v: number) => Math.max(1, Math.round((Math.min(v, max) / max) * height));

  return (
    <View style={{ marginTop: 6, overflow: 'hidden', width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
        {data.map((v, i) => (
          <View
            key={`analytics-bar-${i}`}
            style={{
              width: barWidth,
              height: scale(v),
              marginRight: i === data.length - 1 ? 0 : gap,
              borderRadius: 4,
              backgroundColor: t.colors.primary,
              opacity: v === 0 ? 0.2 : 1,
            }}
          />
        ))}
      </View>
      {/* baseline hint */}
      <View style={{ height, position: 'absolute', left: 0, right: 0 }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: t.colors.outlineVariant }} />
      </View>
    </View>
  );
}
