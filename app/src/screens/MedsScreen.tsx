// C:\Reclaim\app\src\screens\MedsScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Med, MedLog } from '@/lib/api';
import {
  deleteMed,
  listMeds,
  parseSchedule,
  upcomingDoseTimes,
  upsertMed,
  logMedDose,
  listMedLogsLastNDays,
} from '@/lib/api';
import { useNotifications, scheduleMedReminder, cancelAllReminders } from '@/hooks/useNotifications';

export default function MedsScreen() {
  useNotifications();

  const qc = useQueryClient();
  const medsQ = useQuery({ queryKey: ['meds'], queryFn: () => listMeds() });
  const logsQ = useQuery({ queryKey: ['meds_log:last7'], queryFn: () => listMedLogsLastNDays(7) });

  const logMut = useMutation({
    mutationFn: (args: { med_id: string; status: 'taken' | 'skipped' }) => logMedDose(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meds_log:last7'] }),
    onError: (e: any) => Alert.alert('Log error', e?.message ?? 'Failed to log dose'),
  });

  // editing + form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState('08:00,21:00'); // CSV
  const [days, setDays] = useState('1-7'); // CSV or ranges

  const addMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name required');
      const schedule = parseSchedule(times, days);
      return upsertMed({
        id: editingId ?? undefined, // include id when editing
        name: name.trim(),
        dose: dose.trim() || undefined,
        schedule,
      });
    },
    onSuccess: () => {
      setEditingId(null);
      setName('');
      setDose('');
      setTimes('08:00,21:00');
      setDays('1-7');
      qc.invalidateQueries({ queryKey: ['meds'] });
      Alert.alert('Saved', 'Medication saved.');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save med'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteMed(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meds'] }),
  });

  const scheduleAll = async () => {
    try {
      const meds = medsQ.data as Med[] | undefined;
      if (!meds?.length) {
        Alert.alert('Nothing to schedule', 'Add a medication first.');
        return;
      }
      await cancelAllReminders();
      let count = 0;
      for (const m of meds) {
        if (!m.schedule) continue;
        const next14 = upcomingDoseTimes(m.schedule, 14);
        for (const when of next14) {
          await scheduleMedReminder(m.name, m.dose, when);
          count++;
        }
      }
      Alert.alert('Reminders set', `Scheduled ${count} reminders (next ~2 weeks).`);
    } catch (e: any) {
      Alert.alert('Scheduling error', e?.message ?? 'Failed to schedule');
    }
  };

  const renderItem = ({ item }: { item: Med }) => {
    const s = item.schedule;
    const timesPreview = s?.times?.join(', ') ?? '';
    const daysPreview = s?.days?.join(',') ?? '';
    const preview = s ? `Times: ${timesPreview} • Days: ${daysPreview}` : 'No schedule';

    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 12,
          padding: 12,
          marginBottom: 10,
        }}
      >
        <Text style={{ fontWeight: '700' }}>{item.name}</Text>
        {!!item.dose && <Text style={{ opacity: 0.8 }}>{item.dose}</Text>}
        <Text style={{ opacity: 0.8, marginTop: 4 }}>{preview}</Text>

        {/* actions row inside the card */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={() => {
              setEditingId(item.id!);
              setName(item.name);
              setDose(item.dose ?? '');
              setTimes(item.schedule?.times?.join(',') ?? '08:00,21:00');
              setDays(item.schedule?.days?.join(',') ?? '1-7');
            }}
            style={{ padding: 10 }}
          >
            <Text style={{ color: '#0ea5e9', fontWeight: '700' }}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => delMut.mutate(item.id!)} style={{ padding: 10 }}>
            <Text style={{ color: 'tomato', fontWeight: '700' }}>Delete</Text>
          </TouchableOpacity>

          {/* NEW: adherence quick actions */}
          <TouchableOpacity
            onPress={() => logMut.mutate({ med_id: item.id!, status: 'taken' })}
            style={{ padding: 10 }}
          >
            <Text style={{ color: '#10b981', fontWeight: '700' }}>Taken</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => logMut.mutate({ med_id: item.id!, status: 'skipped' })}
            style={{ padding: 10 }}
          >
            <Text style={{ color: '#f59e0b', fontWeight: '700' }}>Skipped</Text>
          </TouchableOpacity>
        </View>

        {/* NEW: recent logs for this med (latest 3) */}
        {logsQ.data && (
          <View style={{ marginTop: 6 }}>
            {(logsQ.data as MedLog[])
              .filter((l) => l.med_id === item.id)
              .slice(0, 3)
              .map((l) => (
                <Text key={l.id} style={{ opacity: 0.75 }}>
                  {new Date(l.taken_at!).toLocaleString()} • {l.status}
                </Text>
              ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Medications</Text>

      {/* Add / Update form */}
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>
          {editingId ? 'Update medication' : 'Add medication'}
        </Text>

        <Text>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Sertraline"
          style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, marginBottom: 10 }}
        />

        <Text>Dose (optional)</Text>
        <TextInput
          value={dose}
          onChangeText={setDose}
          placeholder="e.g. 50 mg"
          style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, marginBottom: 10 }}
        />

        <Text>Times (hh:mm CSV)</Text>
        <TextInput
          value={times}
          onChangeText={setTimes}
          placeholder="08:00,21:00"
          style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, marginBottom: 10 }}
        />

        <Text>Days (1=Mon … 7=Sun; CSV or ranges like 1-5)</Text>
        <TextInput
          value={days}
          onChangeText={setDays}
          placeholder="1-7"
          style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, marginBottom: 10 }}
        />

        <TouchableOpacity
          onPress={() => addMut.mutate()}
          style={{ backgroundColor: '#111827', padding: 12, borderRadius: 12, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            {addMut.isPending ? (editingId ? 'Updating…' : 'Saving…') : editingId ? 'Update' : 'Save'}
          </Text>
        </TouchableOpacity>

        {editingId && (
          <TouchableOpacity
            onPress={() => {
              setEditingId(null);
              setName('');
              setDose('');
              setTimes('08:00,21:00');
              setDays('1-7');
            }}
            style={{ marginTop: 8 }}
          >
            <Text style={{ color: '#0ea5e9', textAlign: 'center' }}>Cancel edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* list */}
      {medsQ.isLoading && <Text style={{ opacity: 0.7 }}>Loading…</Text>}
      {medsQ.error && <Text style={{ color: 'tomato' }}>{(medsQ.error as any)?.message ?? 'Failed to load meds'}</Text>}

      <FlatList
        data={medsQ.data ?? []}
        keyExtractor={(item: Med, index) => item.id ?? `${item.name}-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ opacity: 0.7 }}>No medications yet.</Text>}
      />

      {/* actions */}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
        <TouchableOpacity onPress={scheduleAll} style={{ backgroundColor: '#0ea5e9', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Schedule reminders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            await cancelAllReminders();
            Alert.alert('Cleared', 'All reminders canceled.');
          }}
          style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}
        >
          <Text style={{ fontWeight: '700' }}>Clear reminders</Text>
        </TouchableOpacity>
      </View>

      {/* Test reminder button — below actions */}
      <View style={{ marginTop: 12 }}>
        <TouchableOpacity
          onPress={async () => {
            try {
              if (!name.trim()) {
                Alert.alert('Enter a name in the form first');
                return;
              }
              const when = new Date(Date.now() + 10_000);
              await scheduleMedReminder(name.trim(), dose.trim() || undefined, when);
              Alert.alert('Test scheduled', 'You should get a notification in ~10 seconds.');
            } catch (e: any) {
              Alert.alert('Notification error', e?.message ?? 'Failed to schedule test notification');
            }
          }}
          style={{ backgroundColor: '#10b981', padding: 12, borderRadius: 12, alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>Test reminder in 10s (uses current form)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
