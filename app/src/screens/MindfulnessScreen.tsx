// C:\Reclaim\app\src\screens\MindfulnessScreen.tsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Switch,
  TextInput,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native';
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

const BREATH_PHASES = [
  { key: 'inhale', label: 'Inhale', duration: 4 },
  { key: 'hold', label: 'Hold', duration: 7 },
  { key: 'exhale', label: 'Exhale', duration: 8 },
] as const;

function BreathingCard({ reduceMotion }: { reduceMotion: boolean }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [remainingDisplay, setRemainingDisplay] = useState<number>(BREATH_PHASES[0].duration);
  const remainingRef = useRef<number>(BREATH_PHASES[0].duration);
  const scale = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const phase = BREATH_PHASES[phaseIndex];

  const updateRemaining = useCallback((value: number) => {
    const clamped = Math.max(0, Math.round(value));
    remainingRef.current = clamped;
    setRemainingDisplay(clamped);
  }, []);

  const advancePhase = useCallback(() => {
    setPhaseIndex((prev) => {
      const next = (prev + 1) % BREATH_PHASES.length;
      updateRemaining(BREATH_PHASES[next].duration);
      return next;
    });
  }, [updateRemaining]);

  const resetCycle = useCallback(() => {
    setPhaseIndex(0);
    updateRemaining(BREATH_PHASES[0].duration);
  }, [updateRemaining]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setRunning(false);
      updateRemaining(BREATH_PHASES[phaseIndex].duration);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      setRunning(true);
    }
  }, [phaseIndex, reduceMotion, updateRemaining]);

  useEffect(() => {
    if (reduceMotion || !running) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      scale.stopAnimation();
      scale.setValue(1);
      return;
    }

    const tick = () => {
      const nextRemaining = remainingRef.current - 0.25;
      if (nextRemaining <= 0) {
        updateRemaining(0);
        advancePhase();
      } else {
        updateRemaining(nextRemaining);
        timeoutRef.current = setTimeout(tick, 250);
      }
    };

    timeoutRef.current = setTimeout(tick, 250);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [advancePhase, reduceMotion, running, updateRemaining]);

  useEffect(() => {
    if (reduceMotion || !running) return;
    let target = 1;
    if (phase.key === 'inhale') {
      target = 1.35;
    } else if (phase.key === 'hold') {
      target = 1.35;
    } else {
      target = 0.85;
    }
    Animated.timing(scale, {
      toValue: target,
      duration: phase.key === 'hold' ? 250 : phase.duration * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [phase.key, phase.duration, reduceMotion, running, scale]);

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#dbeafe',
        backgroundColor: '#eff6ff',
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e3a8a', marginBottom: 12 }}>
        4-7-8 Breathing
      </Text>
      {reduceMotion ? (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            {BREATH_PHASES.map((p, idx) => (
              <View
                key={p.key}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  padding: 8,
                  marginHorizontal: 4,
                  borderRadius: 12,
                  backgroundColor: idx === phaseIndex ? '#c7d2fe' : '#e5e7eb',
                }}
              >
                <Text style={{ fontWeight: '600', color: '#1d4ed8' }}>{p.label}</Text>
                <Text style={{ fontSize: 12, color: '#334155' }}>{p.duration}s</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', color: '#1e3a8a' }}>
            {phase.label}
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', color: '#334155', marginTop: 4 }}>
            {phase.duration} seconds
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Advance to the next breathing phase"
              onPress={advancePhase}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: '#2563eb',
                marginHorizontal: 6,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '600' }}>Next step</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Reset breathing cycle"
              onPress={resetCycle}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: '#e2e8f0',
                marginHorizontal: 6,
              }}
            >
              <Text style={{ color: '#1e3a8a', fontWeight: '600' }}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <Animated.View
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: '#c7d2fe',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#6366f1',
              shadowOpacity: 0.35,
              shadowRadius: 12,
              transform: [{ scale }],
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e3a8a' }}>{phase.label}</Text>
            <Text style={{ fontSize: 36, fontWeight: '700', color: '#1e3a8a' }}>{remainingDisplay}</Text>
            <Text style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>seconds</Text>
          </Animated.View>
          <TouchableOpacity
            onPress={() => setRunning((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={running ? 'Pause breathing animation' : 'Resume breathing animation'}
            style={{
              marginTop: 16,
              paddingVertical: 12,
              paddingHorizontal: 18,
              borderRadius: 999,
              backgroundColor: '#1d4ed8',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600' }}>{running ? 'Pause' : 'Resume'}</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={{ fontSize: 12, color: '#475569', marginTop: 12, textAlign: 'center' }}>
        Inhale for 4, hold for 7, and exhale for 8 seconds. Follow the pacing to settle your nervous system.
      </Text>
    </View>
  );
}

export default function MindfulnessScreen() {
  const qc = useQueryClient();
  const [reactiveOn, setReactiveOn] = useState(false);
  const healthTriggers = useHealthTriggers(reactiveOn);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotionEnabled(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduceMotionEnabled(value);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

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
    <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: '#ffffff' }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>Mindfulness</Text>

      <BreathingCard reduceMotion={reduceMotionEnabled} />

      {/* Health-based triggers */}
      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Health-based triggers</Text>
            <Text style={{ fontSize: 12, opacity: 0.7, color: '#111827' }}>
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
          <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 4, color: '#111827' }}>
            Active • Monitoring your health data for triggers
          </Text>
        )}
      </View>

      {/* Quick start tiles */}
      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#111827' }}>Mindfulness Now</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_CHOICES.map(k => (
            <TouchableOpacity key={k} onPress={() => startNow(k)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' }}>
              <Text style={{ color: '#111827' }}>{INTERVENTIONS[k].title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* NEW: Auto-Start Meditation rules */}
      <AutoStartMeditationCard />

      <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 }} />

      {/* Streak + recent */}
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Streak: {streak} day{streak===1?'':'s'}</Text>
      <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 8, color: '#111827' }}>Recent sessions</Text>

      <FlatList
        data={events}
        keyExtractor={(i) => i.id}
        refreshing={isLoading}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['mindfulness'] })}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: '#ffffff' }}>
            <Text style={{ fontSize: 12, opacity: 0.6, color: '#111827' }}>{new Date(item.created_at).toLocaleString()}</Text>
            <Text style={{ fontSize: 16, marginTop: 4, color: '#111827' }}>{item.intervention}</Text>
            <Text style={{ fontSize: 14, opacity: 0.8, color: '#111827' }}>via {item.trigger_type}{item.reason ? ` · ${item.reason}` : ''}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ opacity: 0.6, color: '#111827' }}>No sessions yet.</Text>}
      />

      <TouchableOpacity
        onPress={() => navigateToMood()} // quick tie-in; optional
        style={{ alignSelf: 'center', padding: 10 }}
      >
        <Text style={{ fontSize: 12, opacity: 0.6, color: '#111827' }}>Jump to Mood</Text>
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
    <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' }}>
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#111827' }}>Auto-Start Meditation</Text>

      {/* Type */}
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4, color: '#111827' }}>Meditation Type</Text>
      <Picker selectedValue={type} onValueChange={(v) => setType(v)}>
        {MEDITATION_CATALOG.map(m => (
          <Picker.Item key={m.id} label={`${m.name} (${m.estMinutes}m)`} value={m.id} />
        ))}
      </Picker>

      {/* Mode */}
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 8, color: '#111827' }}>Mode</Text>
      <Picker selectedValue={mode} onValueChange={(v) => setMode(v)}>
        <Picker.Item label="Fixed time (daily)" value="fixed_time" />
        <Picker.Item label="After wake (Health Connect)" value="after_wake" />
      </Picker>

      {/* Params */}
      {mode === 'fixed_time' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Text style={{ color: '#111827' }}>Hour</Text>
          <TextInput
            keyboardType="number-pad"
            value={hour}
            onChangeText={setHour}
            placeholder="0-23"
            placeholderTextColor="#9ca3af"
            style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, color: '#111827', backgroundColor: '#ffffff' }}
          />
          <Text style={{ color: '#111827' }}>Minute</Text>
          <TextInput
            keyboardType="number-pad"
            value={minute}
            onChangeText={setMinute}
            placeholder="0-59"
            placeholderTextColor="#9ca3af"
            style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, color: '#111827', backgroundColor: '#ffffff' }}
          />
        </View>
      ) : (
        <View style={{ marginTop: 6 }}>
          <Text style={{ marginBottom: 4, color: '#111827' }}>Offset minutes after waking</Text>
          <TextInput
            keyboardType="number-pad"
            value={offset}
            onChangeText={setOffset}
            placeholder="e.g. 20"
            placeholderTextColor="#9ca3af"
            style={{ padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, color: '#111827', backgroundColor: '#ffffff' }}
          />
          <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 6, color: '#111827' }}>
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
          <Text style={{ color: '#111827' }}>Send Test</Text>
        </TouchableOpacity>
      </View>

      {/* Small hint */}
      <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 8, color: '#111827' }}>
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
