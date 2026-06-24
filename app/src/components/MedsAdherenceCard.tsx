import React from 'react';
import { View } from 'react-native';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Card, Text, useTheme, type MD3Theme } from 'react-native-paper';
import { listMergedMedDoseLogsLastNDays, listMeds, type Med } from '@/lib/api';
import {
  buildMedAdherenceSnapshot,
  formatAdherencePctLine,
} from '@/lib/meds/medAdherenceSnapshot';
import { MED_LOGS_7D_QUERY_KEY, MED_LOGS_30D_QUERY_KEY } from '@/lib/meds/medAdherenceQueryKeys';
import { useAuth } from '@/providers/AuthProvider';

const WINDOWS = [
  { key: '7-day', days: 7, queryKey: MED_LOGS_7D_QUERY_KEY },
  { key: '30-day', days: 30, queryKey: MED_LOGS_30D_QUERY_KEY },
] as const;

export default function MedsAdherenceCard() {
  const theme = useTheme();
  const { session } = useAuth();
  const enabled = !!session;

  const medsQ = useQuery({ queryKey: ['meds'], queryFn: () => listMeds(), enabled, staleTime: 60_000 });
  const logsQueries = useQueries({
    queries: WINDOWS.map((w) => ({
      queryKey: [...w.queryKey],
      queryFn: () => listMergedMedDoseLogsLastNDays(w.days),
      enabled,
      staleTime: 60_000,
    })),
  });

  const loading = medsQ.isLoading || logsQueries.some((q) => q.isLoading);
  const error = (medsQ.error ?? logsQueries.find((q) => q.error)?.error) as any;
  const meds = (medsQ.data ?? []) as Med[];

  const results = WINDOWS.map((w, i) => {
    const logs = logsQueries[i]?.data ?? [];
    const snapshot = buildMedAdherenceSnapshot(logs, meds, w.days);
    return { label: w.key, snapshot };
  });

  const weekSnapshot = results[0]?.snapshot;

  return (
    <Card mode="elevated" style={{ marginBottom: 10, backgroundColor: theme.colors.surface }}>
      <Card.Content>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.onSurface }}>Medication Adherence</Text>
        {loading && <Text style={{ marginTop: 6, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>Loading…</Text>}
        {error && <Text style={{ marginTop: 6, color: theme.colors.error }}>{error?.message ?? 'Failed to load'}</Text>}

        {!loading && !error && (
          <View style={{ marginTop: 6, gap: 6 }}>
            {results.map((r) => (
              <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ opacity: 0.8, color: theme.colors.onSurfaceVariant }}>{r.label}</Text>
                <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                  {formatAdherencePctLine(r.snapshot, r.label)}
                </Text>
              </View>
            ))}
            <AdherenceBar snapshot={weekSnapshot} theme={theme} />
            <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.6, color: theme.colors.onSurfaceVariant }}>
              {weekSnapshot?.hasScheduledMeds
                ? 'Taken ÷ expected doses for medications with a fixed schedule. Early tracking may show a lower percentage until your full schedule builds up.'
                : 'Schedule adherence applies to medications with fixed times. As-needed medications are tracked by logging use, not this percentage.'}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

function AdherenceBar({
  snapshot,
  theme,
}: {
  snapshot: ReturnType<typeof buildMedAdherenceSnapshot> | undefined;
  theme: MD3Theme;
}) {
  const pct = snapshot?.pct ?? 0;
  const clamped = Math.max(0, Math.min(100, pct));
  const showBar = snapshot?.pct != null;
  if (!showBar) return null;
  return (
    <View style={{ height: 10, backgroundColor: theme.colors.surfaceVariant, borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: theme.colors.primary }} />
    </View>
  );
}
