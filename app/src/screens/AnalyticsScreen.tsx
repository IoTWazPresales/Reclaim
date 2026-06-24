import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, useTheme, Card, Button, type MD3Theme } from 'react-native-paper';
import { listMeditations, listMoodCheckins, type MoodCheckin } from '@/lib/api';
import { getMeditationById } from '@/lib/meditations';
import MedsAdherenceCard from '@/components/MedsAdherenceCard';
import { syncAll } from '@/lib/sync';
import { formatSyncAnalyticsLine } from '@/lib/sync/syncDisplay';
import { useSyncDisplay } from '@/hooks/useSyncDisplay';
import { AppScreen, AppCard } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { reclaimPrimaryCapsuleButton, reclaimUtilityCardSurface } from '@/theme/reclaimVisualLanguage';
import { useAuth } from '@/providers/AuthProvider';

const ANALYTICS_LOAD_TIMEOUT_MS = 8_000;

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
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme), [appTheme]);
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const { session } = useAuth();
  const syncDisplay = useSyncDisplay();
  const qc = useQueryClient();

  const [loadTimedOut, setLoadTimedOut] = useState(false);

  const moodQ = useQuery({
    queryKey: ['mood_checkins:all'],
    queryFn: () => listMoodCheckins(120),
    enabled: !!session,
    staleTime: 60_000,
    retry: 1,
  });
  const medQ = useQuery({
    queryKey: ['meditations:all'],
    queryFn: () => listMeditations(),
    enabled: !!session,
    staleTime: 60_000,
    retry: 1,
  });

  const loading = moodQ.isLoading || medQ.isLoading;
  const error = moodQ.error || medQ.error;

  useEffect(() => {
    if (!loading) {
      setLoadTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadTimedOut(true), ANALYTICS_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  const showLoading = loading && !loadTimedOut;
  const showLoadTimeout = loading && loadTimedOut;

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
      moodOnNonMeditationDays: null as number | null,
      commonTypes7: [] as Array<{ name: string; count: number }>,
      moodSeries14: [] as number[],
      medSeries14: [] as number[],
    };

    const moods = (moodQ.data ?? []) as MoodCheckin[];
    const meds = medQ.data ?? [];

    const start7 = daysAgo(6);
    const start14 = daysAgo(13);
    const start30 = daysAgo(29);

    const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

    const weekMoods = moods.filter((m) => new Date(m.created_at) >= start7);
    const monthMoods = moods.filter((m) => new Date(m.created_at) >= start30);

    const dailyMean = (entries: MoodCheckin[]) => {
      const byDay = new Map<string, number[]>();
      for (const m of entries) {
        const k = dayKey(m.created_at);
        const arr = byDay.get(k) ?? [];
        arr.push(m.mood);
        byDay.set(k, arr);
      }
      const dayAvgs = Array.from(byDay.values()).map((arr) => arr.reduce((a, b) => a + b, 0) / arr.length);
      return mean(dayAvgs);
    };

    res.avg7 = dailyMean(weekMoods);
    res.avg30 = dailyMean(monthMoods);

    const weekMeds = meds.filter((s) => new Date(s.startTime) >= start7);
    const monthMeds = meds.filter((s) => new Date(s.startTime) >= start30);
    res.countMed7 = weekMeds.length;
    res.countMed30 = monthMeds.length;

    const typeCounts = new Map<string, number>();
    for (const s of weekMeds) {
      const name = s.meditationType ? (getMeditationById(s.meditationType)?.name ?? s.meditationType) : 'Meditation';
      typeCounts.set(name, (typeCounts.get(name) ?? 0) + 1);
    }
    res.commonTypes7 = Array.from(typeCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const medDays = new Set(monthMeds.map((s) => dayKey(s.startTime)));
    const moodsByDay = new Map<string, MoodCheckin[]>();
    for (const m of monthMoods) {
      const k = dayKey(m.created_at);
      const arr = moodsByDay.get(k) ?? [];
      arr.push(m);
      moodsByDay.set(k, arr);
    }

    const moodOnMed: number[] = [];
    const moodOff: number[] = [];
    for (const [k, arr] of moodsByDay) {
      const avg = mean(arr.map((x) => x.mood));
      if (avg == null) continue;
      if (medDays.has(k)) moodOnMed.push(avg);
      else moodOff.push(avg);
    }
    res.moodOnMeditationDays = mean(moodOnMed);
    res.moodOnNonMeditationDays = mean(moodOff);

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
      arr.push(m.mood);
      moodByDay.set(k, arr);
    }
    res.moodSeries14 = days.map((k) => {
      const xs = moodByDay.get(k) ?? [];
      return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0;
    });

    const medCountByDay = new Map<string, number>();
    for (const s of meds) {
      const k = dayKey(s.startTime);
      if (new Date(k) < start14) continue;
      medCountByDay.set(k, (medCountByDay.get(k) ?? 0) + 1);
    }
    res.medSeries14 = days.map((k) => medCountByDay.get(k) ?? 0);

    return res;
  }, [moodQ.data, medQ.data]);

  async function onSyncNow() {
    try {
      const { moodUpserted, meditationUpserted } = await syncAll();
      syncDisplay.refresh();
      void qc.invalidateQueries({ queryKey: ['mood_checkins:all'] });
      void qc.invalidateQueries({ queryKey: ['meditations:all'] });
      Alert.alert('Synced', `Mood: ${moodUpserted}\nMeditations: ${meditationUpserted}`);
    } catch (e: any) {
      Alert.alert('Sync failed', e?.message ?? 'Unknown error');
    }
  }

  const canShowCharts = !showLoading && !error;

  return (
    <AppScreen padding="lg">
      <AppCard style={utilitySurface}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Sync</Text>
          <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, opacity: 0.8, color: theme.colors.onSurface }}>
            Last sync: {formatSyncAnalyticsLine(syncDisplay)}
          </Text>
          <Button
            mode="contained"
            onPress={onSyncNow}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            style={[primaryCapsule.style, { marginTop: appTheme.spacing.sm, alignSelf: 'flex-start' }]}
            contentStyle={primaryCapsule.contentStyle}
            labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
          >
            Sync now
          </Button>
        </Card.Content>
      </AppCard>

      {showLoading && (
        <AppCard style={utilitySurface}>
          <Card.Content>
            <ActivityIndicator color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.sm, opacity: 0.7, color: theme.colors.onSurface }}>
              Loading…
            </Text>
          </Card.Content>
        </AppCard>
      )}

      {showLoadTimeout && (
        <AppCard style={utilitySurface}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Still loading your data</Text>
            <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, opacity: 0.8, color: theme.colors.onSurfaceVariant }}>
              This is taking longer than usual. Log a mood check-in or tap Sync now — your charts will fill in as data arrives.
            </Text>
            <Button
              mode="outlined"
              onPress={() => {
                void moodQ.refetch();
                void medQ.refetch();
              }}
              style={{ marginTop: appTheme.spacing.sm, alignSelf: 'flex-start' }}
            >
              Try again
            </Button>
          </Card.Content>
        </AppCard>
      )}

      {error && (
        <AppCard style={[utilitySurface, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer }}>
              {(error as any)?.message ?? 'Failed to load analytics.'}
            </Text>
          </Card.Content>
        </AppCard>
      )}

      {canShowCharts && moodSeries14.every((v) => v === 0) && medSeries14.every((v) => v === 0) && (
        <AppCard style={utilitySurface}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Your insights start here</Text>
            <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, opacity: 0.8, color: theme.colors.onSurfaceVariant }}>
              Analytics build as you log. Check back after a few mood check-ins and meditation sessions — patterns appear here over time.
            </Text>
          </Card.Content>
        </AppCard>
      )}

      {canShowCharts && (
        <>
          <AppCard style={utilitySurface}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Mood</Text>
              {moodSeries14.length === 0 || moodSeries14.every((v) => v === 0) ? (
                <View style={{ paddingVertical: appTheme.spacing.xxl, alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    No mood data yet
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.xs, opacity: 0.7, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    Start logging your mood to see insights here
                  </Text>
                </View>
              ) : (
                <>
                  <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, color: theme.colors.onSurface }}>
                    7-day average: {avg7 ?? '—'}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    30-day average: {avg30 ?? '—'}
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.sm, opacity: 0.7, color: theme.colors.onSurface }}>
                    Last 14 days
                  </Text>
                  <View style={{ overflow: 'hidden', width: '100%' }}>
                    <MiniBarSparkline data={moodSeries14} maxValue={10} height={120} barWidth={20} gap={6} theme={theme} />
                  </View>
                </>
              )}
            </Card.Content>
          </AppCard>

          <AppCard style={utilitySurface}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Meditation</Text>
              {medSeries14.length === 0 || medSeries14.every((v) => v === 0) ? (
                <View style={{ paddingVertical: appTheme.spacing.xxl, alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    No meditation data yet
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.xs, opacity: 0.7, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    Complete mindfulness sessions to see insights here
                  </Text>
                </View>
              ) : (
                <>
                  <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, color: theme.colors.onSurface }}>
                    Past 7 days: {countMed7}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    Past 30 days: {countMed30}
                  </Text>
                  {commonTypes7.length > 0 && (
                    <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, opacity: 0.8, color: theme.colors.onSurface }}>
                      Most common (7d): {commonTypes7.map((t) => `${t.name} (${t.count})`).join(', ')}
                    </Text>
                  )}
                  <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.sm, opacity: 0.7, color: theme.colors.onSurface }}>
                    Last 14 days
                  </Text>
                  <View style={{ overflow: 'hidden', width: '100%' }}>
                    <MiniBarSparkline data={medSeries14} height={36} theme={theme} />
                  </View>
                </>
              )}
            </Card.Content>
          </AppCard>

          <MedsAdherenceCard />

          <AppCard style={utilitySurface}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Mood ↔︎ Meditation</Text>
              {moodOnMeditationDays == null && moodOnNonMeditationDays == null ? (
                <View style={{ paddingVertical: appTheme.spacing.xl, alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    Not enough data yet
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.xs, opacity: 0.7, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    Log mood and complete meditation sessions on the same days to see patterns here.
                  </Text>
                </View>
              ) : (
                <>
                  <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, color: theme.colors.onSurface }}>
                    Days with meditation: {moodOnMeditationDays != null ? `avg ${moodOnMeditationDays}/10` : 'No data yet'}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    Days without: {moodOnNonMeditationDays != null ? `avg ${moodOnNonMeditationDays}/10` : 'No data yet'}
                  </Text>
                  {moodOnMeditationDays != null && moodOnNonMeditationDays != null && (
                    <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, fontWeight: '600', color: theme.colors.onSurface }}>
                      Difference: {Math.round((moodOnMeditationDays - moodOnNonMeditationDays) * 10) / 10} points
                    </Text>
                  )}
                  <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.xs, opacity: 0.6, color: theme.colors.onSurface }}>
                    Descriptive comparison over the last 30 days. More days logged = more reliable pattern.
                  </Text>
                </>
              )}
            </Card.Content>
          </AppCard>
        </>
      )}
    </AppScreen>
  );
}

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
  theme?: MD3Theme;
}) {
  const sparklineTheme = useTheme();
  const t: MD3Theme = theme || sparklineTheme;
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
      <View style={{ height, position: 'absolute', left: 0, right: 0 }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: t.colors.outlineVariant }} />
      </View>
    </View>
  );
}
