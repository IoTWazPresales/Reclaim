import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, FlatList, TextInput, Switch, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  listSleepSessions, addSleepSession, getSleepPrefs, upsertSleepPrefs,
  listSleepCandidates, insertSleepCandidate, resolveSleepCandidate,
} from '@/lib/api';

import { importLatestSleep } from '@/sleep/importer';
import { inferSleepWindow } from '@/sleep/detector';
import { ensureHealthPermissions } from '@/hooks/useHealthPermissions';
import { scheduleBedtimeSuggestion, scheduleMorningConfirm } from '@/hooks/useNotifications';

const AUTO_IMPORT_KEY = 'sleep:autoImport';

export default function SleepScreen() {
  const qc = useQueryClient();

  const [loadingImport, setLoadingImport] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [autoImport, setAutoImport] = useState<boolean>(true);

  // Prefs local state for the Settings card
  const { data: prefs } = useQuery({ queryKey: ['sleep','prefs'], queryFn: getSleepPrefs });
  const [wakeHHMM, setWakeHHMM] = useState<string>('07:00');
  const [targetMins, setTargetMins] = useState<string>('480'); // store as string for input

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sleep','sessions'],
    queryFn: () => listSleepSessions(14),
  });

  const { data: candidates = [], refetch: refetchCandidates } = useQuery({
    queryKey: ['sleep','cands'],
    queryFn: () => listSleepCandidates(3),
  });

  const addSession = useMutation({
    mutationFn: addSleepSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sleep'] }),
    onError: (e:any) => Alert.alert('Sleep', e?.message ?? 'Failed to save'),
  });

  // ----- Init: load prefs + autoImport; request permissions; maybe auto-import
  useEffect(() => {
    (async () => {
      try {
        // load autoImport (default true)
        const stored = await AsyncStorage.getItem(AUTO_IMPORT_KEY);
        if (stored !== null) setAutoImport(stored === '1');

        // seed UI fields from prefs
        if (prefs?.typical_wake_time) {
          // prefs.typical_wake_time is 'HH:MM:SS'; normalize to 'HH:MM'
          const hhmm = prefs.typical_wake_time.slice(0,5);
          setWakeHHMM(hhmm);
        }
        if (prefs?.target_sleep_minutes) {
          setTargetMins(String(prefs.target_sleep_minutes));
        }

        // request permissions once when screen mounts
        await ensureHealthPermissions();

        // auto-import if user enabled it
        if (stored === null || stored === '1') {
          await doImport(true);
        }
      } catch (e:any) {
        console.warn('Sleep init error:', e?.message ?? e);
      } finally {
        setInitializing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Derived: total hours 7d
  const totalHours7d = useMemo(() => {
    const seven = sessions.filter(s =>
      new Date(s.start_time).getTime() > (Date.now() - 7*24*3600*1000)
    );
    const hrs = seven.reduce((acc, s) =>
      acc + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime())/3600000, 0
    );
    return Math.round(hrs*10)/10;
  }, [sessions]);

  // ----- Actions
  const doImport = async (silent = false) => {
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
        if (!silent) Alert.alert('Imported', `From ${w.source}`);
        return;
      }
      // fallback: create candidate
      const guess = inferSleepWindow(new Date(), prefs?.typical_wake_time ?? null);
      await insertSleepCandidate({
        start_guess: guess.start.toISOString(),
        end_guess: guess.end.toISOString(),
        confidence: guess.confidence,
        ctx: guess.ctx as any,
      });
      await refetchCandidates();
      if (!silent) Alert.alert('No wearable data', 'We guessed last night. Please confirm below.');
    } finally {
      setLoadingImport(false);
    }
  };

  const onToggleAutoImport = async (v: boolean) => {
    setAutoImport(v);
    await AsyncStorage.setItem(AUTO_IMPORT_KEY, v ? '1' : '0');
    if (v) {
      // try an immediate import if turning on
      await doImport(true);
    }
  };

  const onSavePrefs = async () => {
    // basic HH:MM validation
    const ok = /^\d{2}:\d{2}$/.test(wakeHHMM);
    const mins = parseInt(targetMins, 10);
    if (!ok || isNaN(mins) || mins < 240 || mins > 720) {
      Alert.alert('Check settings', 'Wake time must be HH:MM, target sleep 240–720 minutes.');
      return;
    }

    await upsertSleepPrefs({
      typical_wake_time: `${wakeHHMM}:00`,
      target_sleep_minutes: mins,
    });

    // schedule nightly suggestion & morning confirm
    await scheduleBedtimeSuggestion(wakeHHMM, mins);
    await scheduleMorningConfirm(wakeHHMM);

    Alert.alert('Saved', 'Sleep settings updated.');
  };

  if (initializing) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, opacity: 0.7 }}>Preparing Sleep…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Sleep</Text>

      {/* Summary + Import */}
      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>Last 7 days</Text>
        <Text style={{ fontSize: 14, opacity: 0.7 }}>Total: {totalHours7d} hours</Text>
        <TouchableOpacity
          onPress={() => doImport(false)}
          disabled={loadingImport}
          style={{ alignSelf: 'flex-start', marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 }}
        >
          <Text>{loadingImport ? 'Checking…' : 'Import last night'}</Text>
        </TouchableOpacity>
      </View>

      {/* Settings */}
      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Settings</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={{ width: 120 }}>Typical wake</Text>
          <TextInput
            value={wakeHHMM}
            onChangeText={setWakeHHMM}
            placeholder="07:00"
            keyboardType="numbers-and-punctuation"
            style={{ flex:1, borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, paddingHorizontal:10, paddingVertical:8 }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={{ width: 120 }}>Target sleep (min)</Text>
          <TextInput
            value={targetMins}
            onChangeText={setTargetMins}
            placeholder="480"
            keyboardType="number-pad"
            style={{ flex:1, borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, paddingHorizontal:10, paddingVertical:8 }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent:'space-between', marginBottom: 8 }}>
          <Text>Auto-import from wearable</Text>
          <Switch value={autoImport} onValueChange={onToggleAutoImport} />
        </View>

        <TouchableOpacity
          onPress={onSavePrefs}
          style={{ alignSelf:'flex-start', marginTop: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor:'#4f46e5' }}
        >
          <Text style={{ color:'#fff', fontWeight:'600' }}>Save</Text>
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
                  onPress={async () => { await resolveSleepCandidate(c.id, true); qc.invalidateQueries({ queryKey: ['sleep'] }); }}
                  style={{ paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#10b981', borderRadius: 8 }}
                >
                  <Text style={{ color: '#065f46' }}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => { await resolveSleepCandidate(c.id, false); qc.invalidateQueries({ queryKey: ['sleep','cands'] }); }}
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
              <Text style={{ fontSize: 12, opacity: 0.6 }}>
                {new Date(item.start_time).toLocaleString()} → {new Date(item.end_time).toLocaleString()}
              </Text>
              <Text style={{ fontSize: 16, marginTop: 4 }}>{durHrs.toFixed(1)} h · {item.source}</Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ opacity: 0.6, marginTop: 8 }}>No sleep logged yet.</Text>}
      />
    </View>
  );
}
