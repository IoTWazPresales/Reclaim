import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSleepSessions, addSleepSession, getSleepPrefs, upsertSleepPrefs,
  listSleepCandidates, insertSleepCandidate, resolveSleepCandidate
} from '@/lib/api';
import { importLatestSleep } from '@/sleep/importer';
import { inferSleepWindow } from '@/sleep/detector';

export default function SleepScreen() {
  const qc = useQueryClient();
  const [loadingImport, setLoadingImport] = useState(false);

  const { data: prefs } = useQuery({ queryKey: ['sleep','prefs'], queryFn: getSleepPrefs });
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({ queryKey: ['sleep','sessions'], queryFn: () => listSleepSessions(14) });
  const { data: candidates = [] } = useQuery({ queryKey: ['sleep','cands'], queryFn: () => listSleepCandidates(3) });

  const addSession = useMutation({
    mutationFn: addSleepSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sleep'] }),
    onError: (e:any) => Alert.alert('Sleep', e?.message ?? 'Failed to save'),
  });

  const onImport = async () => {
    try {
      setLoadingImport(true);
      const w = await importLatestSleep();
      if (w) {
        await addSession.mutateAsync({
          start_time: w.start.toISOString(),
          end_time: w.end.toISOString(),
          source: w.source,
          quality: null, note: null,
        });
        Alert.alert('Imported', `From ${w.source}`);
        return;
      }
      // fallback: phone inference into candidate
      const guess = inferSleepWindow(new Date(), prefs?.typical_wake_time ?? null);
      await insertSleepCandidate({
        start_guess: guess.start.toISOString(),
        end_guess: guess.end.toISOString(),
        confidence: guess.confidence,
        ctx: guess.ctx as any,
      });
      qc.invalidateQueries({ queryKey: ['sleep','cands'] });
      Alert.alert('No wearable data', 'We guessed last night. Please confirm below.');
    } finally {
      setLoadingImport(false);
    }
  };

  const totalHours7d = useMemo(() => {
    const seven = sessions.slice().filter(s => {
      const t = new Date(s.start_time).getTime();
      return t > (Date.now() - 7*24*3600*1000);
    });
    const hrs = seven.reduce((acc, s) => acc + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime())/3600000, 0);
    return Math.round(hrs*10)/10;
  }, [sessions]);

  return (
    <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Sleep</Text>

      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>Last 7 days</Text>
        <Text style={{ fontSize: 14, opacity: 0.7 }}>Total: {totalHours7d} hours</Text>
        <TouchableOpacity
          onPress={onImport}
          disabled={loadingImport}
          style={{ alignSelf: 'flex-start', marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 }}
        >
          <Text>{loadingImport ? 'Checking…' : 'Import last night'}</Text>
        </TouchableOpacity>
      </View>

      {/* Candidate confirmation */}
      {candidates.length > 0 && (
        <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>We think you slept:</Text>
          {candidates.map(c => (
            <View key={c.id} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 14 }}>
                {new Date(c.start_guess).toLocaleString()} → {new Date(c.end_guess).toLocaleString()} (conf: {(c.confidence*100).toFixed(0)}%)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => resolveSleepCandidate(c.id, true)}
                  style={{ paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#10b981', borderRadius: 8 }}
                >
                  <Text style={{ color: '#065f46' }}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => resolveSleepCandidate(c.id, false)}
                  style={{ paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ef4444', borderRadius: 8 }}
                >
                  <Text style={{ color: '#991b1b' }}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* History */}
      <View style={{ height: 1, backgroundColor: '#e5e7eb' }} />
      <Text style={{ fontSize: 18, fontWeight: '700' }}>History</Text>

      <FlatList
        data={sessions}
        keyExtractor={(i) => i.id}
        refreshing={loadingSessions}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['sleep'] })}
        renderItem={({ item }) => {
          const durHrs = (new Date(item.end_time).getTime() - new Date(item.start_time).getTime())/3600000;
          return (
            <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginTop: 8 }}>
              <Text style={{ fontSize: 12, opacity: 0.6 }}>{new Date(item.start_time).toLocaleString()} → {new Date(item.end_time).toLocaleString()}</Text>
              <Text style={{ fontSize: 16, marginTop: 4 }}>{durHrs.toFixed(1)} h · {item.source}</Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ opacity: 0.6, marginTop: 8 }}>No sleep logged yet.</Text>}
      />
    </View>
  );
}
