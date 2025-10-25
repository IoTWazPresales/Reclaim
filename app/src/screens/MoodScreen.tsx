// C:\Reclaim\app\src\screens\MoodScreen.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Switch, Dimensions } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpsertMoodInput } from '@/lib/api';
import {
  addMoodCheckin,
  deleteMoodCheckin,
  hasMoodToday,
  listMoodCheckins,
  listMoodCheckinsRange,
} from '@/lib/api';
import MoodFaces from '@/components/MoodFaces';
import TagPills from '@/components/TagPills';
import { LineChart } from 'react-native-chart-kit';
import { scheduleMoodCheckinReminders, cancelMoodCheckinReminders } from '@/hooks/useNotifications';

const DEFAULT_TAGS = ['work', 'gym', 'family', 'social', 'anxious', 'calm', 'focused', 'tired'];

export default function MoodScreen() {
  const qc = useQueryClient();
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [remindersOn, setRemindersOn] = useState(false);

  // Recent mood history (cards + averages)
  const { data: moods = [], isLoading: loadingList } = useQuery({
    queryKey: ['moods', { limit: 30 }],
    queryFn: () => listMoodCheckins(30),
  });

  // Has logged today?
  const { data: todayDone } = useQuery({
    queryKey: ['moods', 'today'],
    queryFn: () => hasMoodToday(),
  });

  // 30-day range for chart
  const { data: monthMoods = [] } = useQuery({
    queryKey: ['moods', 'range', { days: 30 }],
    queryFn: async () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29); // 30-day window
      return listMoodCheckinsRange(start.toISOString(), end.toISOString());
    },
  });

  const addMutation = useMutation({
    mutationFn: (input: UpsertMoodInput) => addMoodCheckin(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moods'] });
      qc.invalidateQueries({ queryKey: ['moods', 'today'] });
      qc.invalidateQueries({ queryKey: ['moods', 'range'] });
      setMood(null);
      setEnergy(null);
      setTags([]);
      setNote('');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save mood check-in'),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => deleteMoodCheckin(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moods'] });
      qc.invalidateQueries({ queryKey: ['moods', 'range'] });
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to delete'),
  });

  // Averages for header
  const summary = useMemo(() => {
    if (!moods.length) return { avgMood: null as number | null, avgEnergy: null as number | null };
    const mVals = moods.map(m => m.mood);
    const eVals = moods.map(m => m.energy ?? 0).filter(x => x > 0);
    const avg = (arr: number[]) => Math.round((arr.reduce((a,b)=>a+b,0) / arr.length) * 10) / 10;
    return { avgMood: avg(mVals), avgEnergy: eVals.length ? avg(eVals) : null };
  }, [moods]);

  // Aggregate monthMoods -> per-day averages for chart
  const chartData = useMemo(() => {
    const days: string[] = [];
    const keyOf = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(keyOf(d));
    }

    const buckets: Record<string, { mSum: number; mN: number; eSum: number; eN: number }> = {};
    for (const k of days) buckets[k] = { mSum: 0, mN: 0, eSum: 0, eN: 0 };

    monthMoods.forEach(e => {
      const k = e.created_at.slice(0, 10);
      if (!buckets[k]) return;
      buckets[k].mSum += e.mood;
      buckets[k].mN += 1;
      if (typeof e.energy === 'number' && e.energy > 0) { buckets[k].eSum += e.energy; buckets[k].eN += 1; }
    });

    const label = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: '2-digit' });
    const labels = days.map(label);
    const moodAvg = days.map(k => (buckets[k].mN ? buckets[k].mSum / buckets[k].mN : 0));
    const energyAvg = days.map(k => (buckets[k].eN ? buckets[k].eSum / buckets[k].eN : 0));

    return { labels, moodAvg, energyAvg };
  }, [monthMoods]);

  const canSave = mood !== null;

  const onSave = () => {
    if (mood === null) {
      Alert.alert('Missing mood', 'Please select how you feel right now.');
      return;
    }
    addMutation.mutate({
      mood,
      energy: energy ?? undefined,
      tags,
      note: note.trim() || undefined,
      ctx: { source: 'mood_screen_v1' },
    });
  };

  // Reminders toggle
  const onToggleReminders = async (next: boolean) => {
    try {
      if (next) {
        await scheduleMoodCheckinReminders();
        setRemindersOn(true);
        Alert.alert('Enabled', 'Daily reminders set for 08:00 and 20:00.');
      } else {
        await cancelMoodCheckinReminders();
        setRemindersOn(false);
        Alert.alert('Disabled', 'Mood reminders cancelled.');
      }
    } catch (e: any) {
      Alert.alert('Notifications', e?.message ?? 'Could not update reminders');
    }
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Mood Check-In</Text>

      {/* Daily reminders toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Daily reminders</Text>
          <Text style={{ fontSize: 12, opacity: 0.7 }}>08:00 & 20:00 — tap to log directly</Text>
        </View>
        <Switch value={remindersOn} onValueChange={onToggleReminders} />
      </View>

      {todayDone ? (
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#ecfeff', borderWidth: 1, borderColor: '#a5f3fc' }}>
          <Text style={{ fontSize: 14 }}>You’ve already logged a mood today. You can still add another if you want.</Text>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>How do you feel?</Text>
        <MoodFaces value={mood} onChange={setMood} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>Energy (optional): {energy ?? '—'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1,2,3,4,5].map(v => (
            <TouchableOpacity
              key={v}
              onPress={() => setEnergy(v)}
              style={{
                paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
                borderWidth: energy === v ? 2 : 1,
                borderColor: energy === v ? '#4f46e5' : '#e5e7eb',
                backgroundColor: energy === v ? '#eef2ff' : '#fff',
              }}
            >
              <Text style={{ fontSize: 16 }}>{v}</Text>
            </TouchableOpacity>
          ))}
          {energy !== null && (
            <TouchableOpacity
              onPress={() => setEnergy(null)}
              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}
            >
              <Text style={{ fontSize: 14 }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>Quick tags</Text>
        <TagPills options={DEFAULT_TAGS} value={tags} onChange={setTags} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What influenced your mood?"
          multiline
          style={{
            borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
            padding: 12, minHeight: 80, textAlignVertical: 'top'
          }}
        />
      </View>

      <TouchableOpacity
        onPress={onSave}
        disabled={!canSave || addMutation.isPending}
        style={{
          backgroundColor: canSave ? '#4f46e5' : '#c7d2fe',
          paddingVertical: 14, borderRadius: 12, alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          {addMutation.isPending ? 'Saving...' : 'Save Check-In'}
        </Text>
      </TouchableOpacity>

      {/* History */}
      <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 }} />
      <Text style={{ fontSize: 18, fontWeight: '700' }}>Recent</Text>

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 14, opacity: 0.8 }}>Avg mood: {summary.avgMood ?? '—'}</Text>
        <Text style={{ fontSize: 14, opacity: 0.8 }}>Avg energy: {summary.avgEnergy ?? '—'}</Text>
      </View>

      <FlatList
        data={moods}
        keyExtractor={(item) => item.id}
        refreshing={loadingList}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['moods'] })}
        renderItem={({ item }) => (
          <View
            style={{
              borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginBottom: 8,
              backgroundColor: '#fff'
            }}
          >
            <Text style={{ fontSize: 12, opacity: 0.6 }}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
            <Text style={{ fontSize: 16, marginTop: 4 }}>
              Mood: {item.mood} {['😖','🙁','😐','🙂','😄'][item.mood - 1] ?? ''}
              {item.energy ? ` · Energy: ${item.energy}` : ''}
            </Text>
            {!!(item.tags && item.tags.length) && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {item.tags!.map((t) => (
                  <View key={t} style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#f3f4f6' }}>
                    <Text style={{ fontSize: 12 }}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
            {!!item.note && <Text style={{ fontSize: 14, marginTop: 6 }}>{item.note}</Text>}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Delete check-in?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => delMutation.mutate(item.id) },
                  ])
                }
                style={{ paddingVertical: 8, paddingHorizontal: 12 }}
              >
                <Text style={{ color: '#ef4444', fontWeight: '600' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ opacity: 0.6, marginTop: 8 }}>No entries yet.</Text>
        }
      />

      {/* Trends */}
      <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 }} />
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>30-day Trends</Text>

      <LineChart
        data={{
          labels: chartData.labels,
          datasets: [
            { data: chartData.moodAvg, strokeWidth: 2 },
            { data: chartData.energyAvg, strokeWidth: 2 },
          ],
          legend: ['Mood', 'Energy'],
        }}
        width={Math.max(320, screenWidth - 32)}
        height={220}
        fromZero
        yAxisInterval={1}
        segments={5}
        chartConfig={{
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          propsForDots: { r: '2' },
        }}
        bezier
        style={{ borderRadius: 12 }}
      />
      <Text style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Daily averages · missing days show as 0</Text>
    </View>
  );
}
