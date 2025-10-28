import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, ScrollView, Switch } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { upsertTodayEntry, listMood, type MoodEntry } from '@/lib/api';
import { scheduleMoodCheckinReminders, cancelMoodCheckinReminders, ensureNotificationPermission } from '@/hooks/useNotifications';

/* ---------- tiny sparkline (bars) ---------- */
function MiniBarSparkline({
  data,
  maxValue,
  height = 36,
  barWidth = 8,
  gap = 2,
}: {
  data: number[];
  maxValue?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
}) {
  const max = Math.max(1, maxValue ?? (data.length ? Math.max(...data) : 1));
  const scale = (v: number) => Math.max(1, Math.round((Math.min(v, max) / max) * height));

  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {data.map((v, i) => (
          <View
            key={i}
            style={{
              width: barWidth,
              height: scale(v),
              marginRight: i === data.length - 1 ? 0 : gap,
              borderRadius: 4,
              backgroundColor: '#4f46e5',
              opacity: v === 0 ? 0.2 : 1,
            }}
          />
        ))}
      </View>
      <View style={{ height, position: 'absolute', left: 0, right: 0 }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: '#e5e7eb' }} />
      </View>
    </View>
  );
}

/* ---------- helpers ---------- */
function daysAgo(n: number) {
  const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - n); return d;
}
function dayKey(d: Date | string) {
  const t = typeof d === 'string' ? new Date(d) : d;
  const x = new Date(t); x.setHours(0,0,0,0);
  return x.toISOString().slice(0, 10);
}

/* ---------- preset tags (can tweak later) ---------- */
const TAGS = [
  'energized','calm','focused','social',
  'anxious','low','irritable','overwhelmed',
  'tired','in_pain',
];

export default function MoodScreen() {
  const qc = useQueryClient();

  const moodQ = useQuery({
    queryKey: ['mood:all'],
    queryFn: () => listMood(365), // a year for trends
  });

  // form state
  const [rating, setRating] = useState<number>(7);
  const [note, setNote] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [remindersOn, setRemindersOn] = useState<boolean>(false);

  // detect existing reminder state by reading permission only (simple UI model)
  React.useEffect(() => {
    (async () => {
      const ok = await ensureNotificationPermission();
      setRemindersOn(ok); // permission ≠ scheduled, but fine for now
    })();
  }, []);

  const saveMut = useMutation({
    mutationFn: async () => {
      const tagLine = sel.length ? ` ${sel.map(t => `#${t}`).join(' ')}` : '';
      return upsertTodayEntry({
        mood: rating,
        note: (note?.trim() ?? '') + tagLine,
      });
    },
    onSuccess: async () => {
      setNote('');
      await qc.invalidateQueries({ queryKey: ['mood:all'] });
      Alert.alert('Saved', 'Mood saved for today.');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save mood'),
  });

  // quick 14-day series
  const last14Series = useMemo(() => {
    const rows: MoodEntry[] = (moodQ.data ?? []) as MoodEntry[];
    const start14 = daysAgo(13);
    const byDay = new Map<string, number[]>();
    for (const m of rows) {
      const k = dayKey(m.created_at);
      if (new Date(k) < start14) continue;
      const arr = byDay.get(k) ?? [];
      arr.push(m.rating);
      byDay.set(k, arr);
    }
    const days: string[] = []; for (let i=13;i>=0;i--) days.push(dayKey(daysAgo(i)));
    const mean = (xs: number[]) => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0;
    return days.map(k => mean(byDay.get(k) ?? []));
  }, [moodQ.data]);

  const avg7 = useMemo(() => {
    const rows: MoodEntry[] = (moodQ.data ?? []) as MoodEntry[];
    const start7 = daysAgo(6);
    const xs = rows.filter(r => new Date(r.created_at) >= start7).map(r => r.rating);
    if (!xs.length) return null;
    return Math.round((xs.reduce((a,b)=>a+b,0)/xs.length)*10)/10;
  }, [moodQ.data]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 10 }}>Mood</Text>

      {/* Check-in card */}
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <Text style={{ fontWeight: '700' }}>How are you right now?</Text>

        {/* Slider substitute: 10 buttons for consistency across platforms */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
            const on = n === rating;
            return (
              <TouchableOpacity
                key={n}
                onPress={() => setRating(n)}
                style={{
                  paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10,
                  borderWidth: 1, borderColor: on ? '#4f46e5' : '#e5e7eb',
                  backgroundColor: on ? '#eef2ff' : 'white',
                  marginRight: 8, marginBottom: 8
                }}
              >
                <Text style={{ fontWeight: on ? '700' : '500', color: on ? '#4f46e5' : '#111827' }}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tags */}
        <Text style={{ marginTop: 8, fontWeight: '600' }}>Quick tags</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {TAGS.map(t => {
            const on = sel.includes(t);
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setSel(s => on ? s.filter(x=>x!==t) : [...s, t])}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                  borderWidth: 1, borderColor: on ? '#4f46e5' : '#e5e7eb',
                  backgroundColor: on ? '#eef2ff' : 'white',
                  marginRight: 8, marginBottom: 8
                }}
              >
                <Text style={{ color: on ? '#4f46e5' : '#111827' }}>{t.replace('_',' ')}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Note */}
        <Text style={{ marginTop: 8, fontWeight: '600' }}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Anything you'd like to add..."
          multiline
          style={{ marginTop: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, minHeight: 60 }}
        />

        {/* Actions */}
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <TouchableOpacity
            onPress={() => saveMut.mutate()}
            style={{ backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginRight: 10 }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>{saveMut.isPending ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Switch
              value={remindersOn}
              onValueChange={async (v) => {
                try {
                  if (v) {
                    const ok = await ensureNotificationPermission();
                    if (!ok) {
                      Alert.alert('Permission needed', 'Please enable notifications in system settings.');
                      setRemindersOn(false);
                      return;
                    }
                    await scheduleMoodCheckinReminders();
                    setRemindersOn(true);
                    Alert.alert('Enabled', 'Mood reminders scheduled (08:00 & 20:00).');
                  } else {
                    await cancelMoodCheckinReminders();
                    setRemindersOn(false);
                    Alert.alert('Disabled', 'Mood reminders canceled.');
                  }
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to update reminders');
                }
              }}
              style={{ marginRight: 8 }}
            />
            <Text>Remind me</Text>
          </View>
        </View>
      </View>

      {/* Trend card */}
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16 }}>
        <Text style={{ fontWeight: '700' }}>Last 14 days</Text>
        {moodQ.isLoading && <Text style={{ marginTop: 6, opacity: 0.7 }}>Loading…</Text>}
        {moodQ.error && <Text style={{ marginTop: 6, color: 'tomato' }}>{(moodQ.error as any)?.message ?? 'Failed to load mood'}</Text>}
        {!moodQ.isLoading && !moodQ.error && (
          <>
            <MiniBarSparkline data={last14Series} maxValue={10} />
            <Text style={{ marginTop: 6, opacity: 0.8 }}>7-day average: {avg7 ?? '—'}</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}
