// C:\Reclaim\app\src\screens\Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase, SUPABASE_URL } from '@/lib/supabase';
import { getCurrentUser, listEntriesLastNDays, upsertTodayEntry } from '@/lib/api';
import CheckInCard from '@/components/CheckInCard';

// After-wake rescheduler
import { loadMeditationSettings } from '@/lib/meditationSettings';
import { scheduleMeditationAfterWake } from '@/hooks/useMeditationScheduler';

// NEW: sync helpers
import { getLastSyncISO, syncAll } from '@/lib/sync';
import { logger } from '@/lib/logger';

function DashboardInner() {
  const qc = useQueryClient();
  const [who, setWho] = useState<{ id?: string; email?: string } | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Load current user
  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        setWho({ id: user?.id, email: user?.email ?? undefined });
      } catch (e: any) {
        setWho({ id: 'n/a', email: e?.message ?? 'no user' });
      }
    })();
  }, []);

  // After-wake re-schedule on mount
  useEffect(() => {
    (async () => {
      try {
        const s = await loadMeditationSettings();
        for (const r of s.rules) {
          if (r.mode === 'after_wake') {
            await scheduleMeditationAfterWake(r.type, r.offsetMinutes);
          }
        }
      } catch (e) {
        logger.warn('After-wake reschedule failed:', e);
      }
    })();
  }, []);

  // Load last sync time
  useEffect(() => {
    (async () => {
      setLastSync(await getLastSyncISO());
    })();
  }, []);

  const historyQ = useQuery({
    queryKey: ['entries:last7'],
    queryFn: () => listEntriesLastNDays(7),
  });

  const saveToday = useMutation({
    mutationFn: (v: { mood?: number; sleep_hours?: number; note?: string }) => upsertTodayEntry(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries:last7'] });
      Alert.alert('Saved', 'Today’s check-in saved.');
    },
    onError: (err: any) => {
      Alert.alert('Save failed', err?.message ?? 'Unknown error');
    },
  });

  async function doSync() {
    try {
      setSyncing(true);
      const res = await syncAll();
      const iso = await getLastSyncISO();
      setLastSync(iso);
      Alert.alert('Synced', `Mood: ${res.moodUpserted}\nMeditations: ${res.meditationUpserted}`);
    } catch (e: any) {
      Alert.alert('Sync failed', e?.message ?? 'Unknown error');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: '#ffffff' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#111827' }}>Reclaim</Text>

      <CheckInCard onSave={(v) => saveToday.mutate(v)} saving={saveToday.isPending} />

      <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 8, color: '#111827' }}>Last 7 days</Text>
      {historyQ.isLoading && <Text style={{ opacity: 0.7, color: '#111827' }}>Loading…</Text>}
      {historyQ.error && (
        <Text style={{ color: 'tomato' }}>{(historyQ.error as any)?.message ?? 'Failed to load'}</Text>
      )}

      {historyQ.data?.length === 0 && <Text style={{ opacity: 0.7, color: '#111827' }}>No entries yet.</Text>}
      {historyQ.data?.map((e: any) => (
        <Text key={e.id} style={{ opacity: 0.85, marginTop: 6, color: '#111827' }}>
          {new Date(e.ts).toLocaleDateString()} • mood {e.mood ?? '-'} • sleep {e.sleep_hours ?? '-'}
          {e.note ? ` • ${e.note}` : ''}
        </Text>
      ))}

      {/* Debug + Sync */}
      <View style={{ marginTop: 24, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 12 }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Debug</Text>
        <Text style={{ opacity: 0.8 }}>Supabase URL: {SUPABASE_URL}</Text>
        <Text style={{ opacity: 0.8 }}>User ID: {who?.id ?? '—'}</Text>
        <Text style={{ opacity: 0.8 }}>Email: {who?.email ?? '—'}</Text>
        <Text style={{ opacity: 0.8, marginTop: 6 }}>Last sync: {lastSync ? new Date(lastSync).toLocaleString() : '—'}</Text>

        <TouchableOpacity
          onPress={doSync}
          disabled={syncing}
          style={{
            marginTop: 10,
            backgroundColor: syncing ? '#9ca3af' : '#111827',
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            const { data } = await supabase.auth.getSession();
            Alert.alert('Session', data.session ? 'present' : 'missing');
          }}
          style={{ marginTop: 10 }}
        >
          <Text style={{ color: '#0ea5e9' }}>Check session</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ marginTop: 10 }}>
          <Text style={{ color: '#0ea5e9' }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Dashboard() {
  return <DashboardInner />;
}
