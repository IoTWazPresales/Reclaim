import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, Switch } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listMindfulnessEvents, logMindfulnessEvent } from '@/lib/api';
import { INTERVENTIONS, simpleRuleEngine, type InterventionKey } from '@/lib/mindfulness';
import { scheduleNotificationAsync } from 'expo-notifications';
import { navigateToMood } from '@/navigation/nav';

const QUICK_CHOICES: InterventionKey[] = ['box_breath_60', 'five_senses', 'reality_check', 'urge_surf'];

export default function MindfulnessScreen() {
  const qc = useQueryClient();
  const [reactiveOn, setReactiveOn] = useState(false); // placeholder toggle for future sensors

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['mindfulness', { limit: 30 }],
    queryFn: () => listMindfulnessEvents(30),
  });

  const add = useMutation({
    mutationFn: (payload: Parameters<typeof logMindfulnessEvent>[0]) => logMindfulnessEvent(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mindfulness'] }),
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to log session'),
  });

  const streak = useMemo(() => {
    // simple day-by-day streak from events
    const days = new Set(events.map(e => e.created_at.slice(0,10)));
    let s = 0;
    const today = new Date();
    for (let i=0;i<365;i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0,10);
      if (days.has(key)) s++; else break;
    }
    return s;
  }, [events]);

  const startNow = (k: InterventionKey) => {
    add.mutate({
      trigger_type: 'manual',
      reason: 'user_request',
      intervention: k,
      outcome: 'completed',
      ctx: {},
    });
    Alert.alert('Mindfulness', `${INTERVENTIONS[k].title} — starting now.\n\nSteps:\n• ${INTERVENTIONS[k].steps.join('\n• ')}`);
  };

  // Placeholder demo of reactive rule: call this from anywhere you collect signals
  const simulateSignal = async () => {
    const signal = { hr: 108, recentNegativeTags: 2, lastMood: 2 };
    const hit = simpleRuleEngine(signal);
    if (hit.hit && hit.intervention) {
      await scheduleNotificationAsync({
        content: {
          title: 'Take a breath',
          body: 'Looks like things are heating up. 60 seconds of box breathing?',
          data: { type: 'MOOD_REMINDER', dest: 'Mood' },
        },
        trigger: null,
      });
      add.mutate({
        trigger_type: 'rule',
        reason: hit.reason,
        intervention: hit.intervention,
        outcome: 'skipped', // until user taps/does it
        ctx: signal as any,
      });
    } else {
      Alert.alert('Signals OK', 'No intervention needed right now.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Mindfulness</Text>

      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Reactive monitoring</Text>
          <Text style={{ fontSize: 12, opacity: 0.7 }}>Use signals (HR, tags, mood) to suggest an exercise</Text>
        </View>
        <Switch value={reactiveOn} onValueChange={(v) => {
          setReactiveOn(v);
          if (v) simulateSignal(); // demo; replace with real sensor hookups later
        }} />
      </View>

      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Mindfulness Now</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_CHOICES.map(k => (
            <TouchableOpacity key={k} onPress={() => startNow(k)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text>{INTERVENTIONS[k].title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 }} />

      <Text style={{ fontSize: 18, fontWeight: '700' }}>Streak: {streak} day{streak===1?'':'s'}</Text>
      <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>Recent sessions</Text>

      <FlatList
        data={events}
        keyExtractor={(i) => i.id}
        refreshing={isLoading}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['mindfulness'] })}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontSize: 12, opacity: 0.6 }}>{new Date(item.created_at).toLocaleString()}</Text>
            <Text style={{ fontSize: 16, marginTop: 4 }}>{item.intervention}</Text>
            <Text style={{ fontSize: 14, opacity: 0.8 }}>via {item.trigger_type}{item.reason ? ` · ${item.reason}` : ''}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ opacity: 0.6 }}>No sessions yet.</Text>}
      />

      <TouchableOpacity
        onPress={() => navigateToMood()} // quick tie-in; optional
        style={{ alignSelf: 'center', padding: 10 }}
      >
        <Text style={{ fontSize: 12, opacity: 0.6 }}>Jump to Mood</Text>
      </TouchableOpacity>
    </View>
  );
}
