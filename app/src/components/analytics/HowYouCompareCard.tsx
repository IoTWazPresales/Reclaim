import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Text, useTheme } from 'react-native-paper';
import { listMergedMedDoseLogsLastNDays, listMeds, listSleepSessions, type MoodCheckin } from '@/lib/api';
import { buildMedAdherenceSnapshot } from '@/lib/meds/medAdherenceSnapshot';
import { populationBaselines } from '@/lib/analytics/populationBaselines';
import { PopulationCompareRow } from '@/components/analytics/PopulationCompareCard';
import { useAuth } from '@/providers/AuthProvider';
import { useAppTheme } from '@/theme';
import { reclaimUtilityCardSurface } from '@/theme/reclaimVisualLanguage';

function dayKey(d: Date | string): string {
  const t = typeof d === 'string' ? new Date(d) : d;
  const x = new Date(t);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function formatSleepHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
}

function stdDev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

type Props = {
  moods: MoodCheckin[];
  utilitySurface: ReturnType<typeof reclaimUtilityCardSurface>;
};

export function HowYouCompareCard({ moods, utilitySurface }: Props) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const { session } = useAuth();

  const sleepQ = useQuery({
    queryKey: ['sleep_sessions:compare'],
    queryFn: () => listSleepSessions(14),
    enabled: !!session,
    staleTime: 60_000,
  });
  const medsQ = useQuery({ queryKey: ['meds'], queryFn: () => listMeds(), enabled: !!session, staleTime: 60_000 });
  const logsQ = useQuery({
    queryKey: ['med_logs:7d:compare'],
    queryFn: () => listMergedMedDoseLogsLastNDays(7),
    enabled: !!session,
    staleTime: 60_000,
  });

  const compare = useMemo(() => {
    const start7 = daysAgo(6);
    const weekMoods = moods.filter((m) => new Date(m.created_at) >= start7);
    const moodByDay = new Map<string, number[]>();
    for (const m of weekMoods) {
      const k = dayKey(m.created_at);
      const arr = moodByDay.get(k) ?? [];
      arr.push(m.mood);
      moodByDay.set(k, arr);
    }
    const moodDailyAvgs = Array.from(moodByDay.values()).map((arr) => arr.reduce((a, b) => a + b, 0) / arr.length);
    const moodDays = moodDailyAvgs.length;
    const moodVolatility = stdDev(moodDailyAvgs);

    const sessions = (sleepQ.data ?? []).filter((s) => {
      const dur = (s as { durationMin?: number }).durationMin ?? (s as { duration_min?: number }).duration_min;
      return typeof dur === 'number' && dur >= 180;
    });
    const sleepByNight = new Map<string, number>();
    for (const s of sessions) {
      const end = (s as { endTime?: string }).endTime ?? (s as { end_time?: string }).end_time;
      if (!end) continue;
      const k = dayKey(end);
      const durMin = (s as { durationMin?: number }).durationMin ?? (s as { duration_min?: number }).duration_min ?? 0;
      const hrs = durMin / 60;
      sleepByNight.set(k, Math.max(sleepByNight.get(k) ?? 0, hrs));
    }
    const sleepWeek = Array.from(sleepByNight.entries())
      .filter(([k]) => new Date(k) >= start7)
      .map(([, h]) => h);
    const sleepNights = sleepWeek.length;
    const sleepAvg = sleepNights ? sleepWeek.reduce((a, b) => a + b, 0) / sleepNights : null;

    const adherenceSnap = buildMedAdherenceSnapshot(logsQ.data ?? [], medsQ.data ?? [], 7);
    const adherencePct = adherenceSnap.pct;
    const takenDays = new Set<string>();
    for (const l of logsQ.data ?? []) {
      if (l.status !== 'taken') continue;
      const raw = l.taken_at ?? l.scheduled_for ?? l.created_at;
      if (!raw) continue;
      const k = dayKey(raw);
      if (new Date(k) >= start7) takenDays.add(k);
    }
    const adherenceDays = takenDays.size;

    return {
      moodDays,
      moodVolatility,
      sleepNights,
      sleepAvg,
      adherenceDays,
      adherencePct,
    };
  }, [moods, sleepQ.data, logsQ.data, medsQ.data]);

  const anyMetricReady =
    compare.sleepNights >= 7 || compare.moodDays >= 7 || (compare.adherenceDays >= 7 && compare.adherencePct != null);

  const sleepBand = populationBaselines.sleepHours;
  const moodBand = populationBaselines.moodVolatility;
  const adhBand = populationBaselines.adherencePct;

  return (
    <Card mode="elevated" style={utilitySurface}>
      <Card.Content>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          How you compare
        </Text>
        {!anyMetricReady ? (
          <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
            Log a week of data to see how your patterns compare with typical ranges.
          </Text>
        ) : (
          <View>
            {compare.sleepNights >= 7 && compare.sleepAvg != null ? (
              <PopulationCompareRow
                label="Sleep duration"
                typicalLow={sleepBand.typicalLow}
                typicalHigh={sleepBand.typicalHigh}
                userValue={compare.sleepAvg}
                domainMin={4}
                domainMax={10}
                formatValue={(v) => formatSleepHours(v)}
                copy={`Your sleep averaged ${formatSleepHours(compare.sleepAvg)} — most adults land between ${sleepBand.typicalLow}–${sleepBand.typicalHigh}h.`}
              />
            ) : null}
            {compare.moodDays >= 7 && compare.moodVolatility != null ? (
              <PopulationCompareRow
                label="Mood variability"
                typicalLow={moodBand.typicalLow}
                typicalHigh={moodBand.typicalHigh}
                userValue={compare.moodVolatility}
                domainMin={0}
                domainMax={2.5}
                formatValue={(v) => `${v.toFixed(1)} pts`}
                copy={`Your mood varied about ${compare.moodVolatility.toFixed(1)} pts day-to-day — typical range is ${moodBand.typicalLow}–${moodBand.typicalHigh} pts.`}
              />
            ) : null}
            {compare.adherenceDays >= 7 && compare.adherencePct != null ? (
              <PopulationCompareRow
                label="Medication adherence"
                typicalLow={adhBand.typicalLow}
                typicalHigh={adhBand.typicalHigh}
                userValue={compare.adherencePct}
                domainMin={40}
                domainMax={100}
                formatValue={(v) => `${Math.round(v)}%`}
                copy={`Your adherence averaged ${Math.round(compare.adherencePct)}% — typical range is ${adhBand.typicalLow}–${adhBand.typicalHigh}%.`}
              />
            ) : null}
            <Text variant="labelSmall" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant, opacity: 0.65 }}>
              Typical ranges are research-based reference bands — not a ranking.
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}
