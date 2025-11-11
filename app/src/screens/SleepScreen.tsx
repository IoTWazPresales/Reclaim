import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import {
  getUnifiedHealthService,
} from '@/lib/health';
import { syncAll } from '@/lib/sync';
import { logger } from '@/lib/logger';
import { useHealthIntegrationsList } from '@/hooks/useHealthIntegrationsList';
import { HealthIntegrationList } from '@/components/HealthIntegrationList';
import type { IntegrationId } from '@/lib/health/integrationStore';

// Legacy types for compatibility
import type {
  SleepSession as LegacySleepSession,
  SleepStage,
} from '@/lib/sleepHealthConnect';

import { useNotifications, scheduleBedtimeSuggestion, scheduleMorningConfirm } from '@/hooks/useNotifications';
import { upsertTodayEntry } from '@/lib/api';

import {
  loadSleepSettings,
  saveSleepSettings,
  addWakeDetection,
  listWakeDetections,
  type SleepSettings,
  type WakeDetection,
} from '@/lib/sleepSettings';
import {
  rollingAverageHHMM,
  hhmmToMinutes,
  minutesToHHMM,
} from '@/lib/circadianUtils';
import { useTheme } from 'react-native-paper';

function formatErrorDetails(errorDetails: any): string {
  if (!errorDetails) return '';
  if (typeof errorDetails === 'string') return errorDetails;
  if (errorDetails?.message && typeof errorDetails.message === 'string') {
    return errorDetails.message;
  }
  try {
    const seen = new WeakSet();
    return JSON.stringify(
      errorDetails,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      },
      2,
    );
  } catch {
    return String(errorDetails);
  }
}

/* ───────── helpers ───────── */
function fmtHM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

/** Tiny hypnogram using plain Views */
function Hypnogram({ segments }: { segments: { start: string; end: string; stage: SleepStage }[] }) {
  const theme = useTheme();
  const textColor = theme.colors.onSurface ?? '#111827';
  const bandColor = theme.colors.secondary ?? '#4f46e5';
  const bandBackground = theme.colors.surfaceVariant ?? '#f8fafc';

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
      <Text style={{ opacity: 0.7, marginBottom: 4, color: textColor }}>Hypnogram</Text>
      <View style={{ height: 50, backgroundColor: bandBackground, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
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
                backgroundColor: bandColor,
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
  // Hooks must be called unconditionally - wrap the component render instead
  useNotifications();
  const theme = useTheme();
  const textPrimary = theme.colors.onSurface;
  const textSecondary = theme.colors.onSurfaceVariant;
  const surface = theme.colors.surface;
  const borderColor = theme.colors.outlineVariant;
  const background = theme.colors.background;
  const primaryColor = theme.colors.primary;
  const onPrimary = theme.colors.onPrimary;
  const errorColor = theme.colors.error;
  const accentColor = theme.colors.secondary;
  const qc = useQueryClient();
  const [hasError, setHasError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const {
    integrations,
    integrationsLoading,
    integrationsError,
    connectIntegration,
    connectIntegrationPending,
    connectingId,
    disconnectIntegration,
    disconnectIntegrationPending,
    disconnectingId,
    refreshIntegrations,
  } = useHealthIntegrationsList();
  const lastConnectedCountRef = useRef<number>(0);
  const connectedIntegrations = useMemo(
    () => integrations.filter((item) => item.status?.connected),
    [integrations]
  );
  const primaryIntegration = connectedIntegrations[0] ?? null;

  /* ───────── Unified Health Service helpers ───────── */
  async function fetchLastSleepSession(): Promise<LegacySleepSession | null> {
    try {
      const healthService = getUnifiedHealthService();
      
      if (!healthService) {
        console.warn('Health service not available');
        return null;
      }
      
      // Check if permissions are granted before trying to fetch
      try {
        const hasPermissions = await healthService.hasAllPermissions();
        if (!hasPermissions) {
          // Permissions not granted, return null (UI will show message)
          return null;
        }
      } catch (permError) {
        console.warn('Permission check failed:', permError);
        return null;
      }
      
      const session = await healthService.getLatestSleepSession();
      
      if (!session) return null;
      
      // Convert unified format to legacy format
      return {
        startTime: session.startTime instanceof Date ? session.startTime.toISOString() : String(session.startTime),
        endTime: session.endTime instanceof Date ? session.endTime.toISOString() : String(session.endTime),
        durationMin: session.durationMinutes || 0,
        efficiency: session.efficiency ?? null,
        stages: (session.stages || [])?.map((s) => ({
          start: s.start instanceof Date ? s.start.toISOString() : String(s.start),
          end: s.end instanceof Date ? s.end.toISOString() : String(s.end),
          stage: s.stage,
        })) ?? null,
      };
    } catch (error: any) {
      console.error('Failed to fetch sleep session:', error);
      // Don't throw - return null so UI can show a message
      return null;
    }
  }

  async function fetchSleepSessions(days: number = 30): Promise<LegacySleepSession[]> {
    try {
      const healthService = getUnifiedHealthService();
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Note: getLatestSleepSession only returns one session
      // For multiple sessions, we'd need to extend the unified service
      // For now, return array with latest session if available
      const latest = await healthService.getLatestSleepSession();
      
      if (!latest) return [];
      
      return [{
        startTime: latest.startTime.toISOString(),
        endTime: latest.endTime.toISOString(),
        durationMin: latest.durationMinutes,
        efficiency: latest.efficiency ?? null,
        stages: latest.stages?.map((s) => ({
          start: s.start instanceof Date ? s.start.toISOString() : s.start,
          end: s.end instanceof Date ? s.end.toISOString() : s.end,
          stage: s.stage,
        })) ?? null,
      }];
    } catch (error) {
      console.error('Failed to fetch sleep sessions:', error);
      return [];
    }
  }

  /* ───────── data queries ───────── */
  const settingsQ = useQuery<SleepSettings>({
    queryKey: ['sleep:settings'],
    queryFn: loadSleepSettings,
  });

  const detectionsQ = useQuery<WakeDetection[]>({
    queryKey: ['sleep:wakeDetections'],
    queryFn: listWakeDetections,
  });

  const sleepQueryOptions: UseQueryOptions<
    LegacySleepSession | null,
    Error,
    LegacySleepSession | null,
    ['sleep:last']
  > = {
    queryKey: ['sleep:last'],
    queryFn: async () => {
      try {
        return await fetchLastSleepSession();
      } catch (error: any) {
        console.error('SleepScreen: fetchLastSleepSession error:', error);
        setErrorDetails(error);
        setHasError(error?.message ?? 'Failed to fetch sleep data');
        throw error; // Re-throw to trigger onError
      }
    },
    retry: false,
  };

  const sleepQ = useQuery(sleepQueryOptions);

  const sessionsQueryOptions: UseQueryOptions<
    LegacySleepSession[],
    Error,
    LegacySleepSession[],
    ['sleep:sessions:30d']
  > = {
    queryKey: ['sleep:sessions:30d'],
    queryFn: () => fetchSleepSessions(30),
    retry: false,
  };

  const sessionsQ = useQuery(sessionsQueryOptions);

  useEffect(() => {
    const connectedCount = connectedIntegrations.length;
    if (connectedCount > 0 && connectedCount !== lastConnectedCountRef.current) {
      lastConnectedCountRef.current = connectedCount;
      (async () => {
        try {
          await syncAll();
          await qc.invalidateQueries({ queryKey: ['sleep:last'] });
          await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
        } catch (error) {
          logger.warn('Health auto-sync failed', error);
        }
      })();
    } else {
      lastConnectedCountRef.current = connectedCount;
    }
  }, [connectedIntegrations, qc]);

  /* ───────── derived ───────── */
  const s: LegacySleepSession | null = sleepQ.data ?? null;

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

  const isConnectingIntegration = (id: IntegrationId) =>
    connectIntegrationPending && connectingId === id;
  const isDisconnectingIntegration = (id: IntegrationId) =>
    disconnectIntegrationPending && disconnectingId === id;

  const handleConnectIntegration = async (id: IntegrationId) => {
    try {
      const response = await connectIntegration(id);
      const definition = integrations.find((item) => item.id === id);
      const title = definition?.title ?? 'Provider';
      const result = response?.result;
      if (result?.success) {
        Alert.alert('Connected', `${title} connected successfully.`);
        await qc.invalidateQueries({ queryKey: ['sleep:last'] });
        await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
        refreshIntegrations();
        await sleepQ.refetch();
        await sessionsQ.refetch();
      } else {
        const message = result?.message ?? 'Unable to connect.';
        Alert.alert(title, message);
      }
    } catch (error: any) {
      Alert.alert('Connection failed', error?.message ?? 'Unable to connect to the provider.');
    }
  };

  const handleDisconnectIntegration = async (id: IntegrationId) => {
    const definition = integrations.find((item) => item.id === id);
    const title = definition?.title ?? 'Provider';
    Alert.alert(title, `Disconnect ${title}? You can reconnect at any time.`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            await disconnectIntegration(id);
            Alert.alert('Disconnected', `${title} disconnected.`);
            await qc.invalidateQueries({ queryKey: ['sleep:last'] });
            await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
            refreshIntegrations();
            await sleepQ.refetch();
            await sessionsQ.refetch();
          } catch (error: any) {
            Alert.alert('Disconnect failed', error?.message ?? 'Unable to disconnect the provider.');
          }
        },
      },
    ]);
  };

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

  /* ───────── UI ───────── */
  if (hasError) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#111827' }}>Sleep</Text>
        <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: '#ffffff' }}>
          <Text style={{ color: 'tomato', marginBottom: 8, fontWeight: '600' }}>Error: {hasError}</Text>
          {errorDetails && (
            <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }}>
              {formatErrorDetails(errorDetails)}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => {
              setHasError(null);
              setErrorDetails(null);
              sleepQ.refetch();
            }}
            style={{ backgroundColor: '#111827', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, backgroundColor: '#ffffff' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12, color: textPrimary }}>Sleep</Text>

      {/* Health Platform connect/refresh */}
      <View style={{ borderWidth: 1, borderColor: borderColor, borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: surface }}>
        <Text style={{ fontWeight: '700', color: textPrimary }}>Connect & sync</Text>
        <Text style={{ opacity: 0.8, marginTop: 4, color: textPrimary }}>
          Manage which health providers sync your data automatically. Tap a provider to connect.
        </Text>
        {integrationsError ? (
          <Text style={{ marginTop: 8, color: errorColor, fontSize: 13 }}>
            {(integrationsError as any)?.message ?? 'Unable to load integrations.'}
          </Text>
        ) : null}
        {!integrationsLoading && integrations.length > 0 && integrations.every((item) => !item.supported) ? (
          <Text style={{ marginTop: 8, color: textSecondary, fontSize: 13 }}>
            Providers for this platform are not available in the current build. Review your native
            configuration or enable alternate providers.
          </Text>
        ) : null}
        <View style={{ marginTop: 14 }}>
          {integrationsLoading ? (
            <Text style={{ color: '#6b7280' }}>Checking available integrations…</Text>
          ) : (
            <HealthIntegrationList
              items={integrations}
              onConnect={handleConnectIntegration}
              onDisconnect={handleDisconnectIntegration}
              isConnecting={isConnectingIntegration}
              isDisconnecting={isDisconnectingIntegration}
            />
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            refreshIntegrations();
          }}
          style={{
            marginTop: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ fontWeight: '700', color: textPrimary }}>Refresh list</Text>
        </TouchableOpacity>
      </View>

      {/* Last night summary */}
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: '#ffffff' }}>
        <Text style={{ fontWeight: '700', color: '#111827' }}>Last Night</Text>

        {sleepQ.isLoading && <Text style={{ marginTop: 6, opacity: 0.7, color: '#111827' }}>Loading…</Text>}
        {sleepQ.error && (
          <Text style={{ marginTop: 6, color: 'tomato' }}>
            {(sleepQ.error as any)?.message ?? 'Failed to read sleep.'}
          </Text>
        )}

        {!sleepQ.isLoading && !sleepQ.error && !s && (
          <Text style={{ marginTop: 6, opacity: 0.85, color: '#111827' }}>
            {connectedIntegrations.length > 0
              ? `No recent ${primaryIntegration?.title ?? 'connected'} sleep session found (or permission missing).`
              : 'Connect a provider above to see your latest sleep data.'}
          </Text>
        )}

        {s && (
          <>
            <Text style={{ marginTop: 6, opacity: 0.9, color: '#111827' }}>
              {new Date(s.startTime).toLocaleTimeString()} → {new Date(s.endTime).toLocaleTimeString()}
            </Text>
            <Text style={{ marginTop: 2, fontWeight: '600', color: '#111827' }}>Total: {fmtHM(s.durationMin)}</Text>
            {typeof s.efficiency === 'number' && (
              <Text style={{ marginTop: 2, opacity: 0.85, color: '#111827' }}>
                Efficiency: {Math.round(s.efficiency * 100)}%
              </Text>
            )}

            {/* Per-stage minutes */}
            {stageAgg && (
              <View style={{ marginTop: 8 }}>
                {(['awake','light','deep','rem'] as SleepStage[]).map(st => {
                  const v = stageAgg.get(st) ?? 0;
                  return (
                    <Text key={st} style={{ opacity: 0.9, color: '#111827' }}>
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
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: '#ffffff' }}>
        <Text style={{ fontWeight: '700', color: '#111827' }}>Circadian Wake</Text>

        {/* Desired wake input */}
        <Text style={{ marginTop: 6, opacity: 0.85, color: '#111827' }}>Desired wake time (HH:MM):</Text>
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
            placeholderTextColor="#9ca3af"
            inputMode="numeric"
            style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, color: '#111827', backgroundColor: '#ffffff' }}
          />
        </View>

        {/* Detected today (simple: take last session end time) */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '700', color: '#111827' }}>Detected today</Text>
          {s ? (
            (() => {
              const wake = new Date(s.endTime);
              const hhmm = minutesToHHMM(wake.getHours() * 60 + wake.getMinutes());
              const dateKey = new Date(wake.getFullYear(), wake.getMonth(), wake.getDate()).toISOString().slice(0,10);
              return (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ color: '#111827' }}>Natural wake estimate: <Text style={{ fontWeight: '700', color: '#111827' }}>{hhmm}</Text></Text>
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
                      <Text style={{ fontWeight: '700', color: '#111827' }}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()
          ) : (
            <Text style={{ marginTop: 6, opacity: 0.8, color: '#111827' }}>No detected session today yet.</Text>
          )}
        </View>

        {/* Rolling average + apply */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '700', color: '#111827' }}>
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
              <Text style={{ fontWeight: '700', color: '#111827' }}>Use desired wake</Text>
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
              <Text style={{ fontWeight: '700', color: '#111827' }}>Plan to reach desired wake</Text>
              <Text style={{ marginTop: 6, opacity: 0.9, color: '#111827' }}>
                Current: {current} → Desired: {desired} • {suggestLine}
              </Text>
              <Text style={{ opacity: 0.8, marginTop: 4, color: '#111827' }}>
                Tip: shift light, meals, and activity in the same direction; avoid late caffeine; keep a consistent wind-down.
              </Text>
              <Text style={{ opacity: 0.8, marginTop: 2, color: '#111827' }}>
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
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: '#ffffff' }}>
        <Text style={{ fontWeight: '700', color: '#111827' }}>Reminders</Text>
        <Text style={{ opacity: 0.8, marginTop: 4, color: '#111827' }}>
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
            <Text style={{ fontWeight: '700', color: '#111827' }}>Schedule morning confirm</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Roadmap hint */}
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, backgroundColor: '#ffffff' }}>
        <Text style={{ fontWeight: '700', color: '#111827' }}>Coming next</Text>
        <Text style={{ marginTop: 6, opacity: 0.85, color: '#111827' }}>• iOS HealthKit sleep import</Text>
        <Text style={{ opacity: 0.85, color: '#111827' }}>• HR, HRV, and respiratory coupling (overnight)</Text>
        <Text style={{ opacity: 0.85, color: '#111827' }}>• Sleep consistency score & smarter bedtime</Text>
      </View>
    </ScrollView>
  );
}
