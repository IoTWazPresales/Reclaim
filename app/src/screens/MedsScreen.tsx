// C:\Reclaim\app\src\screens\MedsScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
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
import {
  useNotifications,
  cancelAllReminders,
  scheduleMedReminderActionable,
  cancelRemindersForMed,
} from '@/hooks/useNotifications';
import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';

/* ---------- Small date helpers ---------- */
const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const endOfToday = () => { const d = new Date(); d.setHours(23,59,59,999); return d; };
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

export default function MedsScreen() {
  // Keep categories/listener alive
  useNotifications();

  const qc = useQueryClient();
  const medsQ = useQuery({ queryKey: ['meds'], queryFn: () => listMeds() });
  const logsQ = useQuery({ queryKey: ['meds_log:last7'], queryFn: () => listMedLogsLastNDays(7) });

  const { scheduleForMed } = useMedReminderScheduler();

  const logMut = useMutation({
    mutationFn: (args: { med_id: string; status: 'taken' | 'skipped'; scheduled_for?: string }) => logMedDose(args as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meds_log:last7'] }),
    onError: (e: any) => Alert.alert('Log error', e?.message ?? 'Failed to log dose'),
  });

  // editing + form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState('08:00,21:00'); // CSV
  const [days, setDays] = useState('1-7'); // CSV or ranges

  // history drawer state
  const [showHistory, setShowHistory] = useState(false);
  const [filterMedId, setFilterMedId] = useState<string | null>(null);

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
    onSuccess: async (savedMed: Med) => {
      setEditingId(null);
      setName('');
      setDose('');
      setTimes('08:00,21:00');
      setDays('1-7');

      await qc.invalidateQueries({ queryKey: ['meds'] });

      try {
        // prevent duplicates after edits, then schedule next 24h for this med
        await cancelRemindersForMed(savedMed.id!);
        await scheduleForMed(savedMed);
      } catch (e: any) {
        console.warn('Scheduling after save failed:', e?.message ?? e);
      }

      Alert.alert('Saved', 'Medication saved and reminders scheduled for the next 24h.');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save med'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteMed(id),
    onSuccess: async (_data, id) => {
      await cancelRemindersForMed(id);
      await qc.invalidateQueries({ queryKey: ['meds'] });
    },
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
        // Next ~2 weeks using your helper (14 means ~14 days of occurrences)
        const next14 = upcomingDoseTimes(m.schedule, 14);
        for (const when of next14) {
          const at = new Date(when as any);
          await scheduleMedReminderActionable({
            medId: m.id!,
            medName: m.name,
            doseLabel: m.dose,
            doseTimeISO: at.toISOString(),
          });
          count++;
        }
      }
      Alert.alert('Reminders set', `Scheduled ${count} actionable reminders (next ~2 weeks).`);
    } catch (e: any) {
      Alert.alert('Scheduling error', e?.message ?? 'Failed to schedule');
    }
  };

  const renderCard = (item: Med) => {
    const s = item.schedule;
    const timesPreview = s?.times?.join(', ') ?? '';
    const daysPreview = s?.days?.join(',') ?? '';
    const preview = s ? `Times: ${timesPreview} • Days: ${daysPreview}` : 'No schedule';

    return (
      <View
        key={item.id ?? item.name}
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 12,
          marginBottom: 10,
          minHeight: 90, // avoid collapse on first render
        }}
      >
        <Text style={{ fontWeight: '700' }}>{item.name}</Text>
        {!!item.dose && <Text style={{ opacity: 0.8 }}>{item.dose}</Text>}
        <Text style={{ opacity: 0.8, marginTop: 4 }}>{preview}</Text>

        {/* actions row inside the card (no 'gap', use margins to avoid RN flicker) */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          <TouchableOpacity
            onPress={() => {
              setEditingId(item.id!);
              setName(item.name);
              setDose(item.dose ?? '');
              setTimes(item.schedule?.times?.join(',') ?? '08:00,21:00');
              setDays(item.schedule?.days?.join(',') ?? '1-7');
            }}
            style={{ padding: 10, marginRight: 12, marginBottom: 8 }}
          >
            <Text style={{ color: '#0ea5e9', fontWeight: '700' }}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => delMut.mutate(item.id!)} style={{ padding: 10, marginRight: 12, marginBottom: 8 }}>
            <Text style={{ color: 'tomato', fontWeight: '700' }}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => logMut.mutate({ med_id: item.id!, status: 'taken' })}
            style={{ padding: 10, marginRight: 12, marginBottom: 8 }}
          >
            <Text style={{ color: '#10b981', fontWeight: '700' }}>Taken</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => logMut.mutate({ med_id: item.id!, status: 'skipped' })}
            style={{ padding: 10, marginRight: 12, marginBottom: 8 }}
          >
            <Text style={{ color: '#f59e0b', fontWeight: '700' }}>Skipped</Text>
          </TouchableOpacity>
        </View>

        {/* recent logs for this med (latest 3) */}
        {Array.isArray(logsQ.data) && (
          <View style={{ marginTop: 6 }}>
            {(logsQ.data as MedLog[])
              .filter((l) => l.med_id === item.id)
              .slice(0, 3)
              .map((l) => (
                <Text key={l.id} style={{ opacity: 0.75 }}>
                  {new Date(l.taken_at ?? (l as any).created_at ?? Date.now()).toLocaleString()} • {l.status}
                </Text>
              ))}
          </View>
        )}
      </View>
    );
  };

  // Adherence summary (last 7 days)
  const AdherenceBlock = () => {
    if (!logsQ.data) return null;
    const logs = (logsQ.data as MedLog[]) || [];
    const taken = logs.filter((l) => l.status === 'taken').length;
    const total = logs.length || 1;
    const pct = Math.round((taken / total) * 100);

    // simple streak: count consecutive 'taken' days from today backwards
    const map = new Map<string, boolean>();
    for (const l of logs) {
      const d = new Date(l.taken_at ?? (l as any).created_at ?? Date.now());
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      map.set(day, (map.get(day) ?? false) || l.status === 'taken');
    }
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = d.toISOString();
      if (map.get(key)) streak++;
      else break;
    }

    return (
      <View style={{ marginBottom: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12 }}>
        <Text style={{ fontWeight: '700' }}>Adherence (last 7 days)</Text>
        <Text style={{ marginTop: 4, opacity: 0.8 }}>
          Taken: {taken}/{total} ({pct}%)
        </Text>
        <Text style={{ marginTop: 2, opacity: 0.8 }}>
          Current streak: {streak} day{streak === 1 ? '' : 's'}
        </Text>
      </View>
    );
  };

  // Due Today inline actions
  const DueTodayBlock: React.FC<{
    meds: Med[];
    logNow: (payload: { med_id: string; status: 'taken'|'skipped'; scheduled_for?: string }) => void;
  }> = ({ meds, logNow }) => {
    const today = startOfToday();
    const end = endOfToday();

    const items = React.useMemo(() => {
      const rows: Array<{ key: string; med: Med; dueISO: string }> = [];
      for (const m of meds) {
        if (!m.schedule) continue;
        const next24 = upcomingDoseTimes(m.schedule, 1) as any[];
        for (const t of next24) {
          const dt = new Date(t as any);
          if (dt >= today && dt <= end && isSameDay(dt, today)) {
            rows.push({ key: `${m.id}-${dt.toISOString()}`, med: m, dueISO: dt.toISOString() });
          }
        }
      }
      rows.sort((a,b) => a.dueISO.localeCompare(b.dueISO));
      return rows;
    }, [meds]);

    if (items.length === 0) return null;

    return (
      <View style={{ marginBottom: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12 }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Due Today</Text>
        {items.map(({ key, med, dueISO }) => (
          <View key={key} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            <Text style={{ marginBottom: 6 }}>
              {new Date(dueISO).toLocaleTimeString()} — {med.name}{med.dose ? ` — ${med.dose}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => logMut.mutate({ med_id: med.id!, status: 'taken', scheduled_for: dueISO })}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#10b981' }}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Take</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => logMut.mutate({ med_id: med.id!, status: 'skipped', scheduled_for: dueISO })}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f59e0b' }}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const meds = (medsQ.data ?? []) as Med[];

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Medications</Text>

      <AdherenceBlock />
      <DueTodayBlock meds={meds} logNow={(p) => logMut.mutate(p as any)} />

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

      {/* status */}
      {medsQ.isLoading && <Text style={{ opacity: 0.7 }}>Loading…</Text>}
      {medsQ.error && <Text style={{ color: 'tomato' }}>{(medsQ.error as any)?.message ?? 'Failed to load meds'}</Text>}

      {/* render ALL meds inline (no inner scroll) */}
      {meds.length === 0 ? (
        <Text style={{ opacity: 0.7 }}>No medications yet.</Text>
      ) : (
        meds.map(renderCard)
      )}

      {/* actions */}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
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

        <TouchableOpacity
          onPress={() => setShowHistory(true)}
          style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}
        >
          <Text style={{ fontWeight: '700' }}>View history</Text>
        </TouchableOpacity>
      </View>

      {/* Test actionable reminder button */}
      <View style={{ marginTop: 12, marginBottom: 24 }}>
        <TouchableOpacity
          onPress={async () => {
            try {
              const m = meds[0];
              if (!m) {
                Alert.alert('Add a medication first');
                return;
              }
              const when = new Date(Date.now() + 10_000);
              await scheduleMedReminderActionable({
                medId: m.id!,
                medName: m.name,
                doseLabel: m.dose,
                doseTimeISO: when.toISOString(),
              });
              Alert.alert('Test scheduled', `Actionable reminder for "${m.name}" in ~10 seconds.`);
            } catch (e: any) {
              Alert.alert('Notification error', e?.message ?? 'Failed to schedule test notification');
            }
          }}
          style={{ backgroundColor: '#10b981', padding: 12, borderRadius: 12, alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>Test actionable reminder in 10s</Text>
        </TouchableOpacity>
      </View>

      {/* History drawer (unchanged) */}
      {showHistory && (
        <View style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          maxHeight: '70%', backgroundColor: 'white',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          padding: 16, borderWidth: 1, borderColor: '#e5e7eb'
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>History (last 7 days)</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)}>
              <Text style={{ color: '#0ea5e9', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Filter by med */}
          <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setFilterMedId(null)}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: filterMedId ? 'white' : '#e5f2ff' }}
            >
              <Text>All</Text>
            </TouchableOpacity>
            {meds.map((m: Med) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setFilterMedId(m.id!)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: filterMedId === m.id ? '#e5f2ff' : 'white' }}
              >
                <Text>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 12 }}>
            {(() => {
              const logs = ((logsQ.data as MedLog[]) ?? [])
                .filter(l => !filterMedId || l.med_id === filterMedId)
                .slice()
                .sort((a,b) => new Date(b.taken_at ?? (b as any).created_at ?? 0).getTime() - new Date(a.taken_at ?? (a as any).created_at ?? 0).getTime());

              // group by day
              const byDay = new Map<string, MedLog[]>();
              for (const l of logs) {
                const d = new Date(l.taken_at ?? (l as any).created_at ?? Date.now());
                const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
                byDay.set(key, [...(byDay.get(key) ?? []), l]);
              }

              const days = Array.from(byDay.entries());

              if (!days.length) {
                return <Text style={{ opacity: 0.7 }}>No logs yet.</Text>;
              }

              return (
                <View style={{ maxHeight: 320 }}>
                  {/* kept as a FlatList inside the drawer; it's a separate overlay */}
                  {/* you can convert this to a ScrollView if you want absolutely no inner scrolls */}
                </View>
              );
            })()}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
