import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Med, MedLog } from '@/lib/api';
import { listMeds, listMedLogsLastNDays, logMedDose } from '@/lib/api';
import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { cancelRemindersForMed } from '@/hooks/useNotifications';
import type { MedsStackParamList } from '@/routing/MedsStack';

type RouteParams = { id: string };

// Compat: some logs may have scheduled_for / created_at
type MedLogCompat = MedLog & { scheduled_for?: string | null; created_at?: string | null };
const logWhenISO = (l: MedLogCompat) => l.scheduled_for ?? l.taken_at ?? l.created_at ?? new Date().toISOString();
const logWhenDate = (l: MedLogCompat) => new Date(logWhenISO(l));

function MiniBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <View style={{ height: 10, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: '#10b981' }} />
    </View>
  );
}

export default function MedDetailsScreen() {
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
      <View style={{ flex: 1, padding: 16, backgroundColor: '#ffffff' }}>
        <Text style={{ fontWeight: '700', fontSize: 18, color: '#111827' }}>Medication</Text>
        <Text style={{ marginTop: 8, color: 'tomato' }}>Not found.</Text>
        <TouchableOpacity onPress={() => (nav as any).goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#0ea5e9' }}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const times = med.schedule?.times?.join(', ') ?? '—';
  const days  = med.schedule?.days?.join(',') ?? '—';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, backgroundColor: '#ffffff' }}>
      {/* Header */}
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>{med.name}</Text>
      {!!med.dose && <Text style={{ marginTop: 2, opacity: 0.8, color: '#111827' }}>{med.dose}</Text>}

      {/* Schedule */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#ffffff' }}>
        <Text style={{ fontWeight: '700', color: '#111827' }}>Schedule</Text>
        <Text style={{ marginTop: 4, opacity: 0.85, color: '#111827' }}>Times: {times}</Text>
        <Text style={{ opacity: 0.85, color: '#111827' }}>Days: {days}  <Text style={{ opacity: 0.6, color: '#111827' }}>(1=Mon…7=Sun)</Text></Text>
      </View>

      {/* Quick actions for reminders */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#ffffff' }}>
        <Text style={{ fontWeight: '700', color: '#111827' }}>Reminders</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          <TouchableOpacity
            onPress={async () => {
              try { await scheduleForMed(med); Alert.alert('Scheduled', 'Next 24h reminders set.'); }
              catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed to schedule'); }
            }}
            style={{ backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginRight: 10, marginBottom: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Schedule next 24h</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              try { await cancelRemindersForMed(med.id!); Alert.alert('Canceled', 'All reminders for this med canceled.'); }
              catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed'); }
            }}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 }}
          >
            <Text style={{ fontWeight: '600', color: '#111827' }}>Cancel reminders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Adherence */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#ffffff' }}>
        <Text style={{ fontWeight: '700', color: '#111827' }}>Adherence (30 days)</Text>
        <Text style={{ marginTop: 4, opacity: 0.85, color: '#111827' }}>Taken: {taken30}/{total30}  ({pct30}%)</Text>
        <MiniBar pct={pct30} />
      </View>

      {/* Recent logs */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#ffffff' }}>
        <Text style={{ fontWeight: '700', color: '#111827' }}>Recent</Text>
        {byDay.length === 0 && <Text style={{ marginTop: 6, opacity: 0.7, color: '#111827' }}>No logs in the last 30 days.</Text>}
        {byDay.map(([day, rows]) => (
          <View key={day} style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: '700', marginBottom: 4, color: '#111827' }}>{day}</Text>
            {rows.map((l) => {
              const when = logWhenDate(l);
              return (
                <Text key={l.id} style={{ opacity: 0.85, marginBottom: 4, color: '#111827' }}>
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
        <Text style={{ color: '#0ea5e9', fontWeight: '700' }}>Open in Meds to edit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
