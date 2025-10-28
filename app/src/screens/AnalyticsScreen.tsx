import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listMeditations, listMood, type MoodEntry } from '@/lib/api';
import { getMeditationById } from '@/lib/meditations';
import MedsAdherenceCard from '@/components/MedsAdherenceCard';
import { getLastSyncISO, syncAll } from '@/lib/sync';

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
  const moodQ = useQuery({
    queryKey: ['mood:all'],
    queryFn: () => listMood(1000),
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
    res.avg7  = mean(weekMoods.map(m => m.rating));
    res.avg30 = mean(monthMoods.map(m => m.rating));

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

    // 14-day series (oldest→newest)
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) days.push(dayKey(daysAgo(i)));

    const moodMap = new Map<string, number>(); // daily avg
    for (const [k, arr] of moodsByDay) {
      if (new Date(k) < start14) continue;
      const avg = mean(arr.map(x => x.rating));
      if (avg != null) moodMap.set(k, avg);
    }
    res.moodSeries14 = days.map(k => (moodMap.has(k) ? (moodMap.get(k) as number) : 0));

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
    <View style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Insights</Text>

      {/* Sync status */}
      <View style={{ padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>Sync</Text>
        <Text style={{ marginTop: 6, opacity: 0.8 }}>
          Last sync: {lastSyncQ.data ? new Date(lastSyncQ.data).toLocaleString() : '—'}
        </Text>
        <TouchableOpacity
          onPress={onSyncNow}
          style={{ marginTop: 8, backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start' }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Sync now</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={{ padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, opacity: 0.7 }}>Loading…</Text>
        </View>
      )}

      {error && (
        <View style={{ padding: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', borderRadius: 12 }}>
          <Text style={{ color: '#b91c1c' }}>
            {(error as any)?.message ?? 'Failed to load analytics.'}
          </Text>
        </View>
      )}

      {!loading && !error && (
        <>
          {/* Mood Summary */}
          <View style={{ padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Mood</Text>
            <Text style={{ marginTop: 6 }}>7-day average: {avg7 ?? '—'}</Text>
            <Text>30-day average: {avg30 ?? '—'}</Text>

            {/* Sparkline: last 14 days (avg per day) */}
            <Text style={{ marginTop: 10, opacity: 0.7 }}>Last 14 days</Text>
            <MiniBarSparkline data={moodSeries14} maxValue={10} height={36} />
          </View>

          {/* Meditation Summary */}
          <View style={{ padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Meditation</Text>
            <Text style={{ marginTop: 6 }}>Past 7 days: {countMed7}</Text>
            <Text>Past 30 days: {countMed30}</Text>
            {commonTypes7.length > 0 && (
              <Text style={{ marginTop: 6, opacity: 0.8 }}>
                Most common (7d): {commonTypes7.map(t => `${t.name} (${t.count})`).join(', ')}
              </Text>
            )}

            {/* Sparkline: last 14 days (sessions per day) */}
            <Text style={{ marginTop: 10, opacity: 0.7 }}>Last 14 days</Text>
            <MiniBarSparkline data={medSeries14} height={36} />
          </View>

          {/* Medication Adherence */}
          <MedsAdherenceCard />

          {/* Correlation Insight */}
          <View style={{ padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Mood ↔︎ Meditation</Text>
            <Text style={{ marginTop: 6 }}>
              Avg mood on days with meditation: {moodOnMeditationDays ?? '—'}
            </Text>
            <Text>
              Avg mood on days without meditation: {moodOnNonMeditationDays ?? '—'}
            </Text>
            {moodOnMeditationDays != null && moodOnNonMeditationDays != null && (
              <Text style={{ marginTop: 6, fontWeight: '600' }}>
                Difference: {Math.round(((moodOnMeditationDays - moodOnNonMeditationDays) * 10)) / 10}
              </Text>
            )}
            <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
              Simple descriptive comparison over the last 30 days (same-day averages).
            </Text>
          </View>
        </>
      )}
    </View>
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
}: {
  data: number[];
  maxValue?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
}) {
  const max = Math.max(1, maxValue ?? (data.length ? Math.max(...data) : 1));
  const scale = (v: number) => Math.max(1, Math.round((Math.min(v, max) / max) * height));

  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {data.map((v, i) => (
          <View
            key={i}
            style={{
              width: barWidth,
              height: scale(v),
              marginRight: i === data.length - 1 ? 0 : gap,
              borderRadius: 4,
              backgroundColor: '#4f46e5',
              opacity: v === 0 ? 0.2 : 1,
            }}
          />
        ))}
      </View>
      {/* baseline hint */}
      <View style={{ height, position: 'absolute', left: 0, right: 0 }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: '#e5e7eb' }} />
      </View>
    </View>
  );
}
