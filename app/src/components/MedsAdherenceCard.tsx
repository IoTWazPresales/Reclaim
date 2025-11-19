import React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Text, useTheme } from 'react-native-paper';
import { listMedDoseLogsLastNDays, computeAdherence } from '@/lib/api';

function daysWindow(n: number) {
  return { key: `meds-adherence-${n}`, label: `${n}-day`, n };
}
const WINDOWS = [daysWindow(7), daysWindow(30)];

export default function MedsAdherenceCard() {
  const theme = useTheme();
  const queries = WINDOWS.map(w =>
    useQuery({
      queryKey: [w.key],
      queryFn: () => listMedDoseLogsLastNDays(w.n),
    })
  );

  const loading = queries.some(q => q.isLoading);
  const error = queries.find(q => q.error)?.error as any;

  const results = queries.map((q, i) => {
    const logs = q.data ?? [];
    return { label: WINDOWS[i].label, ...computeAdherence(logs) };
  });

  return (
    <Card mode="elevated" style={{ marginBottom: 10, backgroundColor: theme.colors.surface }}>
      <Card.Content>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.onSurface }}>Medication Adherence</Text>
        {loading && <Text style={{ marginTop: 6, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>Loading…</Text>}
        {error && <Text style={{ marginTop: 6, color: theme.colors.error }}>{error?.message ?? 'Failed to load'}</Text>}

        {!loading && !error && (
          <View style={{ marginTop: 6, gap: 6 }}>
            {results.map(r => (
              <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ opacity: 0.8, color: theme.colors.onSurfaceVariant }}>{r.label}</Text>
                <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                  {r.pct}%  <Text style={{ opacity: 0.6 }}>({r.taken}/{r.scheduled})</Text>
                </Text>
              </View>
            ))}
            <AdherenceBar pct={results[0]?.pct ?? 0} theme={theme} />
            <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.6, color: theme.colors.onSurfaceVariant }}>
              Taken ÷ scheduled doses. Skipped doses are excluded from the numerator.
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

function AdherenceBar({ pct, theme }: { pct: number; theme: ReturnType<typeof useTheme> }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ height: 10, backgroundColor: theme.colors.surfaceVariant, borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: theme.colors.primary }} />
    </View>
  );
}
