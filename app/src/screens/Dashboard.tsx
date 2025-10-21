import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase, SUPABASE_URL } from '@/lib/supabase';
import { getCurrentUser, listEntriesLastNDays, upsertTodayEntry } from '@/lib/api';
import CheckInCard from '@/components/CheckInCard';
import { useNavigation } from '@react-navigation/native';

const localQC = new QueryClient();

function DashboardInner() {
  const qc = useQueryClient();
  const [who, setWho] = useState<{ id?: string; email?: string } | null>(null);
const nav = useNavigation<any>();
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

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Reclaim</Text>

      <CheckInCard onSave={(v) => saveToday.mutate(v)} saving={saveToday.isPending} />

      <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 8 }}>Last 7 days</Text>
      {historyQ.isLoading && <Text style={{ opacity: 0.7 }}>Loading…</Text>}
      {historyQ.error && (
        <Text style={{ color: 'tomato' }}>{(historyQ.error as any)?.message ?? 'Failed to load'}</Text>
      )}

      {historyQ.data?.length === 0 && <Text style={{ opacity: 0.7 }}>No entries yet.</Text>}
      {historyQ.data?.map((e: any) => (
        <Text key={e.id} style={{ opacity: 0.85, marginTop: 6 }}>
          {new Date(e.ts).toLocaleDateString()} • mood {e.mood ?? '-'} • sleep {e.sleep_hours ?? '-'}
          {e.note ? ` • ${e.note}` : ''}
        </Text>
      ))}

      {/* Debug panel */}
      <View style={{ marginTop: 24, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 12 }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Debug</Text>
        <Text style={{ opacity: 0.8 }}>Supabase URL: {SUPABASE_URL}</Text>
        <Text style={{ opacity: 0.8 }}>User ID: {who?.id ?? '—'}</Text>
        <Text style={{ opacity: 0.8 }}>Email: {who?.email ?? '—'}</Text>

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
  return (
    <QueryClientProvider client={localQC}>
      <DashboardInner />
    </QueryClientProvider>
  );
}
