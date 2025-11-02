// C:\Reclaim\app\src\screens\MindfulnessScreen.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, Switch, TextInput } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listMindfulnessEvents, logMindfulnessEvent } from '@/lib/api';
import { INTERVENTIONS, simpleRuleEngine, type InterventionKey } from '@/lib/mindfulness';
import { scheduleNotificationAsync } from 'expo-notifications';
import { navigateToMood } from '@/navigation/nav';

// NEW: meditation auto-start imports
import { Picker } from '@react-native-picker/picker';
import { MEDITATION_CATALOG, type MeditationType } from '@/lib/meditations';
import { loadMeditationSettings, saveMeditationSettings } from '@/lib/meditationSettings';
import { scheduleMeditationAtTime, scheduleMeditationAfterWake } from '@/hooks/useMeditationScheduler';
import { useHealthTriggers } from '@/hooks/useHealthTriggers';

const QUICK_CHOICES: InterventionKey[] = ['box_breath_60', 'five_senses', 'reality_check', 'urge_surf'];

export default function MindfulnessScreen() {
  const qc = useQueryClient();
  const [reactiveOn, setReactiveOn] = useState(false);
  const healthTriggers = useHealthTriggers(reactiveOn);

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

  return (
    <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Mindfulness</Text>

      {/* Health-based triggers */}
      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Health-based triggers</Text>
            <Text style={{ fontSize: 12, opacity: 0.7 }}>
              Get mindfulness reminders based on your heart rate, stress, sleep, and activity
            </Text>
          </View>
          <Switch 
            value={reactiveOn} 
            onValueChange={(v) => {
              setReactiveOn(v);
              if (v) {
                healthTriggers.start();
              } else {
                healthTriggers.stop();
              }
            }} 
          />
        </View>
        {reactiveOn && healthTriggers.isActive && (
          <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            Active • Monitoring your health data for triggers
          </Text>
        )}
      </View>

      {/* Quick start tiles */}
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

      {/* NEW: Auto-Start Meditation rules */}
      <AutoStartMeditationCard />

      <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 }} />

      {/* Streak + recent */}
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

/* ──────────────────────────────────────────────────────────────
   Auto-Start Meditation Card
   - Choose meditation type from catalog (includes your Riverfields practices)
   - Mode: daily fixed time OR after wake (Health Connect)
   - Saves rule and schedules appropriate notification
   - Notifications carry deep link: reclaim://meditation?type=...&autoStart=true
   - Your updated useNotifications opens the link on tap
   ────────────────────────────────────────────────────────────── */
type FixedRule = { mode: 'fixed_time'; type: MeditationType; hour: number; minute: number };
type WakeRule  = { mode: 'after_wake'; type: MeditationType; offsetMinutes: number };

function AutoStartMeditationCard() {
  const [mode, setMode] = useState<'fixed_time' | 'after_wake'>('fixed_time');
  const [type, setType] = useState<MeditationType>('body_scan');

  // Fixed time inputs
  const [hour, setHour] = useState('7');
  const [minute, setMinute] = useState('30');

  // After-wake input (minutes after last SleepSession end)
  const [offset, setOffset] = useState('20');

  // Persist rule and schedule notifications
  const onSave = async () => {
    const settings = await loadMeditationSettings();
    const nextRules = settings.rules.slice();

    let newRule: FixedRule | WakeRule;

    if (mode === 'fixed_time') {
      const hourNum = clampInt(hour, 0, 23);
      const minuteNum = clampInt(minute, 0, 59);
      newRule = { mode: 'fixed_time', type, hour: hourNum, minute: minuteNum };

      // De-duplicate same rule (simple JSON equality)
      const withoutDup = nextRules.filter(r => JSON.stringify(r) !== JSON.stringify(newRule));
      await saveMeditationSettings({ rules: [...withoutDup, newRule] });

      await scheduleMeditationAtTime(newRule.type, hourNum, minuteNum);
      Alert.alert('Saved', `Daily ${labelFor(type)} at ${pad2(hourNum)}:${pad2(minuteNum)} scheduled.`);
    } else {
      const offsetNum = clampInt(offset, 0, 240);
      newRule = { mode: 'after_wake', type, offsetMinutes: offsetNum };

      const withoutDup = nextRules.filter(r => JSON.stringify(r) !== JSON.stringify(newRule));
      await saveMeditationSettings({ rules: [...withoutDup, newRule] });

      const id = await scheduleMeditationAfterWake(newRule.type, offsetNum);
      Alert.alert('Saved', id ? `After-wake ${labelFor(type)} scheduled for today.` : 'No fresh sleep end found—will try again next launch.');
    }
  };

  // Quick test: fire a one-shot "now" meditation deep-link (no schedule)
  const testNow = async () => {
    await scheduleNotificationAsync({
      content: {
        title: 'Test Meditation',
        body: `Open ${labelFor(type)} now`,
        // IMPORTANT: url payload is consumed in useNotifications → Linking.openURL(url)
        data: { url: `reclaim://meditation?type=${encodeURIComponent(type)}&autoStart=true` },
      },
      trigger: null,
    });
    Alert.alert('Sent', 'A test notification was sent; tap it to verify deep-link autostart.');
  };

  return (
    <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Auto-Start Meditation</Text>

      {/* Type */}
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Meditation Type</Text>
      <Picker selectedValue={type} onValueChange={(v) => setType(v)}>
        {MEDITATION_CATALOG.map(m => (
          <Picker.Item key={m.id} label={`${m.name} (${m.estMinutes}m)`} value={m.id} />
        ))}
      </Picker>

      {/* Mode */}
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 8 }}>Mode</Text>
      <Picker selectedValue={mode} onValueChange={(v) => setMode(v)}>
        <Picker.Item label="Fixed time (daily)" value="fixed_time" />
        <Picker.Item label="After wake (Health Connect)" value="after_wake" />
      </Picker>

      {/* Params */}
      {mode === 'fixed_time' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Text>Hour</Text>
          <TextInput
            keyboardType="number-pad"
            value={hour}
            onChangeText={setHour}
            style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10 }}
            placeholder="0-23"
          />
          <Text>Minute</Text>
          <TextInput
            keyboardType="number-pad"
            value={minute}
            onChangeText={setMinute}
            style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10 }}
            placeholder="0-59"
          />
        </View>
      ) : (
        <View style={{ marginTop: 6 }}>
          <Text style={{ marginBottom: 4 }}>Offset minutes after waking</Text>
          <TextInput
            keyboardType="number-pad"
            value={offset}
            onChangeText={setOffset}
            style={{ padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10 }}
            placeholder="e.g. 20"
          />
          <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
            Uses last sleep session from your health app (Apple Health on iOS, Google Fit on Android). If nothing recent, scheduling is skipped for today.
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <TouchableOpacity onPress={onSave} style={{ flex: 1, backgroundColor: '#000', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Save Rule</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={testNow} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text>Send Test</Text>
        </TouchableOpacity>
      </View>

      {/* Small hint */}
      <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
        When the notification is tapped, it opens the Meditation tab and auto-starts the selected practice.
      </Text>
    </View>
  );
}

/* ── helpers ────────────────────────────────────────────── */
function clampInt(v: string, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function labelFor(t: MeditationType) {
  const f = MEDITATION_CATALOG.find(m => m.id === t);
  return f?.name ?? t.replace(/_/g, ' ');
}
