import React from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listMedDoseLogsLastNDays, computeAdherence } from '@/lib/api';

function daysWindow(n: number) {
  return { key: `meds-adherence-${n}`, label: `${n}-day`, n };
}
const WINDOWS = [daysWindow(7), daysWindow(30)];

export default function MedsAdherenceCard() {
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
    <View style={{ padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: '700' }}>Medication Adherence</Text>
      {loading && <Text style={{ marginTop: 6, opacity: 0.7 }}>Loading…</Text>}
      {error && <Text style={{ marginTop: 6, color: 'tomato' }}>{error?.message ?? 'Failed to load'}</Text>}

      {!loading && !error && (
        <View style={{ marginTop: 6, gap: 6 }}>
          {results.map(r => (
            <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ opacity: 0.8 }}>{r.label}</Text>
              <Text style={{ fontWeight: '600' }}>
                {r.pct}%  <Text style={{ opacity: 0.6 }}>({r.taken}/{r.scheduled})</Text>
              </Text>
            </View>
          ))}
          <AdherenceBar pct={results[0]?.pct ?? 0} />
          <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
            Taken ÷ scheduled doses. Skipped doses are excluded from the numerator.
          </Text>
        </View>
      )}
    </View>
  );
}

function AdherenceBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ height: 10, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: '#10b981' }} />
    </View>
  );
}
