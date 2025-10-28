import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Platform, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getLastSleepSession,
  getSleepSessions,
  ensureSleepPermission,
  isHealthConnectAvailable,
  type SleepSession,
  type SleepStage,
} from '@/lib/sleepHealthConnect';

import { useNotifications, scheduleBedtimeSuggestion, scheduleMorningConfirm } from '@/hooks/useNotifications';
import { upsertTodayEntry } from '@/lib/api';

import {
  loadSleepSettings,
  saveSleepSettings,
  addWakeDetection,
  listWakeDetections,
  type SleepSettings,
  type WakeDetection,    // ← add this
} from '@/lib/sleepSettings';
import {
  rollingAverageHHMM,
  hhmmToMinutes,
  minutesToHHMM,
} from '@/lib/circadianUtils';

/* ───────── helpers ───────── */
function fmtHM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

/** Tiny hypnogram using plain Views */
function Hypnogram({ segments }: { segments: { start: string; end: string; stage: SleepStage }[] }) {
  if (!segments.length) return null;
  const start = +new Date(segments[0].start);
  const end = +new Date(segments[segments.length - 1].end);
  const total = Math.max(1, end - start);

  const stageLevel = (s: SleepStage) => {
    // y-level (lower = deeper sleep)
    switch (s) {
      case 'awake': return 0;
      case 'light': return 1;
      case 'rem':   return 1.5;
      case 'deep':  return 2;
      default:      return 1;
    }
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ opacity: 0.7, marginBottom: 4 }}>Hypnogram</Text>
      <View style={{ height: 50, backgroundColor: '#f8fafc', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
        {segments.map((seg, i) => {
          const w = Math.max(2, Math.round((+new Date(seg.end) - +new Date(seg.start)) / total * 300));
          const leftPct = ((+new Date(seg.start) - start) / total) * 100;
          const y = stageLevel(seg.stage);
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                bottom: y * 12,      // lower is deeper
                width: w,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#4f46e5',
                opacity: seg.stage === 'awake' ? 0.35 : 1,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function SleepScreen() {
  useNotifications();
  const qc = useQueryClient();

  /* ───────── data queries ───────── */
  const settingsQ = useQuery<SleepSettings>({
  queryKey: ['sleep:settings'],
  queryFn: loadSleepSettings,
});

  // AFTER
const detectionsQ = useQuery<WakeDetection[]>({
  queryKey: ['sleep:wakeDetections'],
  queryFn: listWakeDetections,
});

  const sleepQ = useQuery({
    queryKey: ['sleep:last'],
    queryFn: getLastSleepSession,
  });

  const sessionsQ = useQuery({
    queryKey: ['sleep:sessions:30d'],
    queryFn: () => getSleepSessions(30),
  });

  /* ───────── derived ───────── */
  const s: SleepSession | null = sleepQ.data ?? null;

  const stageAgg = useMemo(() => {
    if (!s?.stages?.length) return null;
    const acc = new Map<SleepStage, number>();
    for (const seg of s.stages) {
      const min = Math.max(0, Math.round((+new Date(seg.end) - +new Date(seg.start)) / 60000));
      acc.set(seg.stage, (acc.get(seg.stage) ?? 0) + min);
    }
    return acc;
  }, [s?.stages]);

  const rollingAvg = useMemo(() => {
    const det = detectionsQ.data ?? [];
    return rollingAverageHHMM(det.map(d => ({ date: d.date, hhmm: d.hhmm })), 14);
  }, [detectionsQ.data]);

  /* ───────── mutations ───────── */
  const confirmMut = useMutation({
    mutationFn: async (payload: { durationMin?: number; note?: string }) =>
      upsertTodayEntry({
        sleep_hours: payload.durationMin ? Math.round((payload.durationMin / 60) * 10) / 10 : undefined,
        note: payload.note,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sleep:last'] });
      Alert.alert('Saved', 'Sleep confirmed for today.');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save sleep'),
  });

  /* ───────── local UI state ───────── */
  const [desiredInput, setDesiredInput] = React.useState<string>('');
React.useEffect(() => {
  if (settingsQ.data?.desiredWakeHHMM !== undefined) {
    setDesiredInput(settingsQ.data.desiredWakeHHMM);
  }
}, [settingsQ.data?.desiredWakeHHMM]);
  React.useEffect(() => {
    if (settingsQ.data?.desiredWakeHHMM) setDesiredInput(settingsQ.data.desiredWakeHHMM);
  }, [settingsQ.data?.desiredWakeHHMM]);

  /* ───────── UI ───────── */
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Sleep</Text>

      {/* Health Connect connect/refresh (Android) */}
      {Platform.OS === 'android' && (
        <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontWeight: '700' }}>Health Connect</Text>
          <Text style={{ opacity: 0.8, marginTop: 4 }}>Read last night’s sleep session and stages from your device.</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const avail = await isHealthConnectAvailable();
                  if (!avail) {
                    Alert.alert('Not available', 'Health Connect is not available on this device.');
                    return;
                  }
                  const ok = await ensureSleepPermission();
                  if (!ok) {
                    Alert.alert('Permission needed', 'Sleep read permission was not granted.');
                    return;
                  }
                  await qc.invalidateQueries({ queryKey: ['sleep:last'] });
                  await qc.refetchQueries({ queryKey: ['sleep:last'] });
                  await sessionsQ.refetch();
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to request permission');
                }
              }}
              style={{
                backgroundColor: '#111827',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                marginRight: 10,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Connect & refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { qc.refetchQueries({ queryKey: ['sleep:last'] }); sessionsQ.refetch(); }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                marginBottom: 10,
              }}
            >
              <Text style={{ fontWeight: '700' }}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Last night summary */}
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <Text style={{ fontWeight: '700' }}>Last Night</Text>

        {sleepQ.isLoading && <Text style={{ marginTop: 6, opacity: 0.7 }}>Loading…</Text>}
        {sleepQ.error && (
          <Text style={{ marginTop: 6, color: 'tomato' }}>
            {(sleepQ.error as any)?.message ?? 'Failed to read sleep.'}
          </Text>
        )}

        {!sleepQ.isLoading && !sleepQ.error && !s && (
          <Text style={{ marginTop: 6, opacity: 0.85 }}>
            {Platform.OS === 'android'
              ? 'No recent Health Connect sleep session found (or permission missing).'
              : 'HealthKit integration pending on iOS.'}
          </Text>
        )}

        {s && (
          <>
            <Text style={{ marginTop: 6, opacity: 0.9 }}>
              {new Date(s.startTime).toLocaleTimeString()} → {new Date(s.endTime).toLocaleTimeString()}
            </Text>
            <Text style={{ marginTop: 2, fontWeight: '600' }}>Total: {fmtHM(s.durationMin)}</Text>
            {typeof s.efficiency === 'number' && (
              <Text style={{ marginTop: 2, opacity: 0.85 }}>
                Efficiency: {Math.round(s.efficiency * 100)}%
              </Text>
            )}

            {/* Per-stage minutes */}
            {stageAgg && (
              <View style={{ marginTop: 8 }}>
                {(['awake','light','deep','rem'] as SleepStage[]).map(st => {
                  const v = stageAgg.get(st) ?? 0;
                  return (
                    <Text key={st} style={{ opacity: 0.9 }}>
                      {st.toUpperCase()}: {fmtHM(v)}
                    </Text>
                  );
                })}
              </View>
            )}

            {s.stages?.length ? <Hypnogram segments={s.stages} /> : null}

            <TouchableOpacity
              onPress={() => confirmMut.mutate({ durationMin: s.durationMin })}
              style={{ marginTop: 12, backgroundColor: '#111827', padding: 12, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>
                {confirmMut.isPending ? 'Saving…' : 'Confirm sleep for today'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Circadian planning (Desired, Detected today, Rolling avg) */}
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <Text style={{ fontWeight: '700' }}>Circadian Wake</Text>

        {/* Desired wake input */}
        <Text style={{ marginTop: 6, opacity: 0.85 }}>Desired wake time (HH:MM):</Text>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <TouchableOpacity
            onPress={async () => {
              try {
                const hhmm = (desiredInput || '').trim() || '07:00';
                const next = await saveSleepSettings({ desiredWakeHHMM: hhmm });
                await settingsQ.refetch();
                Alert.alert('Saved', `Desired wake set to ${next.desiredWakeHHMM}.`);
              } catch (e: any) {
                Alert.alert('Error', e?.message ?? 'Failed to save desired wake');
              }
            }}
            style={{ backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginRight: 10 }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>Save desired</Text>
          </TouchableOpacity>

          <TextInput
            value={desiredInput}
            onChangeText={setDesiredInput}
            placeholder={settingsQ.data?.desiredWakeHHMM ?? '07:00'}
            inputMode="numeric"
            style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10 }}
          />
        </View>

        {/* Detected today (simple: take last session end time) */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '700' }}>Detected today</Text>
          {s ? (
            (() => {
              const wake = new Date(s.endTime);
              const hhmm = minutesToHHMM(wake.getHours() * 60 + wake.getMinutes());
              const dateKey = new Date(wake.getFullYear(), wake.getMonth(), wake.getDate()).toISOString().slice(0,10);
              return (
                <View style={{ marginTop: 6 }}>
                  <Text>Natural wake estimate: <Text style={{ fontWeight: '700' }}>{hhmm}</Text></Text>
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await addWakeDetection({ date: dateKey, hhmm });
                          await detectionsQ.refetch();
                          Alert.alert('Added', `Saved today's detection (${hhmm}).`);
                        } catch (e: any) {
                          Alert.alert('Error', e?.message ?? 'Failed to add detection');
                        }
                      }}
                      style={{ backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginRight: 10 }}
                    >
                      <Text style={{ color: 'white', fontWeight: '700' }}>Add to log</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => detectionsQ.refetch()}
                      style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}
                    >
                      <Text style={{ fontWeight: '700' }}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()
          ) : (
            <Text style={{ marginTop: 6, opacity: 0.8 }}>No detected session today yet.</Text>
          )}
        </View>

        {/* Rolling average + apply */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '700' }}>
            Rolling average (14d): {rollingAvg ?? '—'}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const hhmm = rollingAvg ?? settingsQ.data?.typicalWakeHHMM ?? '07:00';
                  const saved = await saveSleepSettings({ typicalWakeHHMM: hhmm });
                  await scheduleMorningConfirm(hhmm);
                  Alert.alert('Applied', `Typical wake set to ${saved.typicalWakeHHMM}. Morning confirm rescheduled.`);
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to apply');
                }
              }}
              style={{ backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginRight: 10, marginBottom: 10 }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Use rolling avg</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                try {
                  const hhmm = settingsQ.data?.desiredWakeHHMM ?? '07:00';
                  const saved = await saveSleepSettings({ typicalWakeHHMM: hhmm });
                  await scheduleMorningConfirm(hhmm);
                  Alert.alert('Applied', `Typical wake set to ${saved.typicalWakeHHMM} (desired). Morning confirm rescheduled.`);
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to apply');
                }
              }}
              style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 }}
            >
              <Text style={{ fontWeight: '700' }}>Use desired wake</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recommendation to reach desired wake */}
        {(() => {
          const desired = settingsQ.data?.desiredWakeHHMM;
          const current = rollingAvg ?? settingsQ.data?.typicalWakeHHMM;
          if (!desired || !current) return null;

          const curM = hhmmToMinutes(current);
          const dstM = hhmmToMinutes(desired);
          let delta = dstM - curM; // positive = later, negative = earlier
          if (Math.abs(delta) > 720) { // shortest direction around clock
            delta = delta > 0 ? delta - 1440 : delta + 1440;
          }

          const perDay = delta > 0 ? Math.min(20, delta) : Math.max(-20, delta); // ±20 min/day
          const daysNeeded = Math.ceil(Math.abs(delta) / Math.abs(perDay || 1));
          const bedtimeFromWake = (wakeHHMM: string, targetMin: number) => {
            const w = hhmmToMinutes(wakeHHMM);
            const bedtimeMin = ((w - targetMin) % 1440 + 1440) % 1440;
            return minutesToHHMM(bedtimeMin);
          };

          const suggestLine = `Shift ~${Math.abs(perDay)} min/day for ~${daysNeeded} day${daysNeeded===1?'':'s'}.`;

          return (
            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <Text style={{ fontWeight: '700' }}>Plan to reach desired wake</Text>
              <Text style={{ marginTop: 6, opacity: 0.9 }}>
                Current: {current} → Desired: {desired} • {suggestLine}
              </Text>
              <Text style={{ opacity: 0.8, marginTop: 4 }}>
                Tip: shift light, meals, and activity in the same direction; avoid late caffeine; keep a consistent wind-down.
              </Text>
              <Text style={{ opacity: 0.8, marginTop: 2 }}>
                Bedtime tonight (for {settingsQ.data?.targetSleepMinutes ?? 480} min sleep): {bedtimeFromWake(current, settingsQ.data?.targetSleepMinutes ?? 480)}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const wake = settingsQ.data?.typicalWakeHHMM ?? current;
                      await scheduleBedtimeSuggestion(wake, settingsQ.data?.targetSleepMinutes ?? 480);
                      Alert.alert('Scheduled', `Bedtime suggestions use wake ${wake}. Update typical wake to change this.`);
                    } catch (e: any) {
                      Alert.alert('Error', e?.message ?? 'Failed to schedule bedtime');
                    }
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 10, marginTop: 6 }}
                >
                  <Text style={{ fontWeight: '700' }}>Schedule bedtime</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </View>

      {/* Reminders */}
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <Text style={{ fontWeight: '700' }}>Reminders</Text>
        <Text style={{ opacity: 0.8, marginTop: 4 }}>
          Bedtime suggestion is calculated from your typical wake time minus target sleep window.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          <TouchableOpacity
            onPress={async () => {
              try {
                const wake = settingsQ.data?.typicalWakeHHMM ?? '07:00';
                const mins = settingsQ.data?.targetSleepMinutes ?? 480;
                await scheduleBedtimeSuggestion(wake, mins);
                Alert.alert('Scheduled', `Bedtime suggestion set (wake ${wake}, target ${(mins/60).toFixed(1)}h).`);
              } catch (e: any) {
                Alert.alert('Error', e?.message ?? 'Failed to schedule');
              }
            }}
            style={{
              backgroundColor: '#111827',
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              marginRight: 10,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>Schedule bedtime</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              try {
                const wake = settingsQ.data?.typicalWakeHHMM ?? '07:00';
                await scheduleMorningConfirm(wake);
                Alert.alert('Scheduled', `Morning confirm set (${wake}).`);
              } catch (e: any) {
                Alert.alert('Error', e?.message ?? 'Failed to schedule');
              }
            }}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: '700' }}>Schedule morning confirm</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Roadmap hint */}
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16 }}>
        <Text style={{ fontWeight: '700' }}>Coming next</Text>
        <Text style={{ marginTop: 6, opacity: 0.85 }}>• iOS HealthKit sleep import</Text>
        <Text style={{ opacity: 0.85 }}>• HR, HRV, and respiratory coupling (overnight)</Text>
        <Text style={{ opacity: 0.85 }}>• Sleep consistency score & smarter bedtime</Text>
      </View>
    </ScrollView>
  );
}
