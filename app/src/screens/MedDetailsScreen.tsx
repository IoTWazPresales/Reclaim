import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'react-native-paper';

import { listMeds, listMedLogsLastNDays, logMedDose, type Med, type MedLog } from '@/lib/api';
import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { cancelRemindersForMed } from '@/hooks/useNotifications';
import type { MedsStackParamList } from '@/routing/MedsStack';

type RouteParams = { id: string };

// Compat: some logs may have scheduled_for / created_at
type MedLogCompat = MedLog & { scheduled_for?: string | null; created_at?: string | null };
const logWhenISO = (l: MedLogCompat) => l.scheduled_for ?? l.taken_at ?? l.created_at ?? new Date().toISOString();
const logWhenDate = (l: MedLogCompat) => new Date(logWhenISO(l));

function MiniBar({ pct, theme }: { pct: number; theme: any }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <View style={{ height: 10, backgroundColor: theme.colors.surfaceVariant, borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: theme.colors.primary }} />
    </View>
  );
}

export default function MedDetailsScreen() {
  const theme = useTheme();
  const route = useRoute();
  const nav = useNavigation();
  const qc = useQueryClient();
  const { scheduleForMed } = useMedReminderScheduler();

  const { id } = (route.params as RouteParams) ?? { id: '' };

  const medsQ = useQuery({ queryKey: ['meds'], queryFn: () => listMeds() });
  const logsQ = useQuery({ queryKey: ['med_logs:30', id], queryFn: () => listMedLogsLastNDays(30) });

  const med: Med | undefined = useMemo(() => {
    const arr = (medsQ.data ?? []) as Med[];
    return arr.find(m => m.id === id);
  }, [medsQ.data, id]);

  const medLogs = useMemo(() => {
    const all = (logsQ.data ?? []) as MedLog[];
    return all.filter(l => l.med_id === id) as MedLogCompat[];
  }, [logsQ.data, id]);

  const logMut = useMutation({
    mutationFn: (args: { med_id: string; status: 'taken'|'skipped'|'missed'; scheduled_for?: string }) => logMedDose(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['med_logs:30', id] }),
    onError: (e: any) => Alert.alert('Log error', e?.message ?? 'Failed to log dose'),
  });

  // Adherence (30d)
  const { pct30, taken30, total30 } = useMemo(() => {
    const taken = medLogs.filter(l => l.status === 'taken').length;
    const total = medLogs.length || 1;
    const pct = Math.round((taken / total) * 100);
    return { pct30: pct, taken30: taken, total30: total };
  }, [medLogs]);

  // Group logs by day (desc)
  const byDay = useMemo(() => {
    const map = new Map<string, MedLogCompat[]>();
    for (const l of medLogs) {
      const d = logWhenDate(l);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
      map.set(key, [...(map.get(key) ?? []), l]);
    }
    return Array.from(map.entries()).sort(
      (a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [medLogs]);

  if (!med) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
        <Text style={{ fontWeight: '700', fontSize: 18, color: theme.colors.onSurface }}>Medication</Text>
        <Text style={{ marginTop: 8, color: theme.colors.error }}>Not found.</Text>
        <TouchableOpacity onPress={() => (nav as any).goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: theme.colors.primary }}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const times = med.schedule?.times?.join(', ') ?? '—';
  const days  = med.schedule?.days?.join(',') ?? '—';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.onSurface }}>{med.name}</Text>
      {!!med.dose && <Text style={{ marginTop: 2, opacity: 0.8, color: theme.colors.onSurfaceVariant }}>{med.dose}</Text>}

      {/* Schedule */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>Schedule</Text>
        <Text style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Times: {times}</Text>
        <Text style={{ opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Days: {days}  <Text style={{ opacity: 0.6, color: theme.colors.onSurfaceVariant }}>(1=Mon…7=Sun)</Text></Text>
      </View>

      {/* Quick actions for reminders */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>Reminders</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          <TouchableOpacity
            onPress={async () => {
              try { await scheduleForMed(med); Alert.alert('Scheduled', 'Next 24h reminders set.'); }
              catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed to schedule'); }
            }}
            style={{ backgroundColor: theme.colors.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginRight: 10, marginBottom: 8 }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>Schedule next 24h</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              try { await cancelRemindersForMed(med.id!); Alert.alert('Canceled', 'All reminders for this med canceled.'); }
              catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed'); }
            }}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.outlineVariant, marginBottom: 8 }}
          >
            <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>Cancel reminders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Adherence */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>Adherence (30 days)</Text>
        <Text style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Taken: {taken30}/{total30}  ({pct30}%)</Text>
        <MiniBar pct={pct30} theme={theme} />
      </View>

      {/* Recent logs */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>Recent</Text>
        {byDay.length === 0 && <Text style={{ marginTop: 6, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>No logs in the last 30 days.</Text>}
        {byDay.map(([day, rows]) => (
          <View key={day} style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: '700', marginBottom: 4, color: theme.colors.onSurface }}>{day}</Text>
            {rows.map((l) => {
              const when = logWhenDate(l);
              return (
                <Text key={l.id} style={{ opacity: 0.85, marginBottom: 4, color: theme.colors.onSurfaceVariant }}>
                  {when.toLocaleTimeString()} • {l.status}
                </Text>
              );
            })}
          </View>
        ))}
      </View>

      {/* Manage / Edit */}
      <TouchableOpacity
        onPress={() => (nav as any).goBack()} // keep editing on main Meds screen for now
        style={{ alignSelf: 'flex-start', marginTop: 14 }}
      >
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Open in Meds to edit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
