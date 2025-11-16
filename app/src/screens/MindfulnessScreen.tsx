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
  ScrollView,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'react-native-paper';
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

// Include 4-7-8 breathing as 'breath_478' - we'll use a special key
const QUICK_CHOICES: (InterventionKey | 'breath_478')[] = ['breath_478', 'box_breath_60', 'five_senses', 'reality_check', 'urge_surf'];

// Add 4-7-8 breathing as a special guided intervention
const BREATHING_478_INTERVENTION: InterventionKey = 'box_breath_60'; // Using box_breath as placeholder for now

const BREATH_PHASES = [
  { key: 'inhale', label: 'Inhale', duration: 4 },
  { key: 'hold', label: 'Hold', duration: 7 },
  { key: 'exhale', label: 'Exhale', duration: 8 },
] as const;

function BreathingCard({ reduceMotion, theme, onComplete }: { reduceMotion: boolean; theme: any; onComplete?: () => void }) {
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
      // If we've completed a full cycle (back to inhale from exhale), call onComplete
      if (next === 0 && prev === BREATH_PHASES.length - 1 && onComplete) {
        // Small delay to ensure animation completes
        setTimeout(() => {
          onComplete();
        }, 500);
      }
      return next;
    });
  }, [updateRemaining, onComplete]);

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

  // Synchronized countdown and animation - single effect to keep them in sync
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

    // Set initial animation values based on phase
    let target = 1;
    let duration = phase.duration * 1000;
    let initialValue = 1;
    
    if (phase.key === 'inhale') {
      // Inhale: grow from 1 to 1.35 over 4 seconds
      target = 1.35;
      duration = 4000;
      initialValue = 1;
      scale.setValue(1);
    } else if (phase.key === 'hold') {
      // Hold: stay constant at 1.35 for 7 seconds
      target = 1.35;
      duration = 7000;
      initialValue = 1.35;
      scale.setValue(1.35);
    } else if (phase.key === 'exhale') {
      // Exhale: shrink from 1.35 to 0.85 over 8 seconds
      target = 0.85;
      duration = 8000;
      initialValue = 1.35;
      scale.setValue(1.35);
    }
    
    // Start animation synchronized with countdown
    scale.stopAnimation(() => {
      Animated.timing(scale, {
        toValue: target,
        duration: duration,
        easing: phase.key === 'hold' ? Easing.linear : Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    // Start countdown ticker - synchronized with animation
    const tick = () => {
      const nextRemaining = remainingRef.current - 0.1;
      if (nextRemaining <= 0) {
        updateRemaining(0);
        // Advance phase immediately when countdown reaches 0
        advancePhase();
      } else {
        updateRemaining(nextRemaining);
        timeoutRef.current = setTimeout(tick, 100);
      }
    };

    // Start countdown immediately
    timeoutRef.current = setTimeout(tick, 100);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      scale.stopAnimation();
    };
  }, [phase.key, phase.duration, reduceMotion, running, advancePhase, updateRemaining]);

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 12 }}>
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
                  backgroundColor: idx === phaseIndex ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                }}
              >
                <Text style={{ fontWeight: '600', color: theme.colors.onPrimaryContainer }}>{p.label}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>{p.duration}s</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', color: theme.colors.onSurface }}>
            {phase.label}
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
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
                backgroundColor: theme.colors.primary,
                marginHorizontal: 6,
              }}
            >
              <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>Next step</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Reset breathing cycle"
              onPress={resetCycle}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: theme.colors.surfaceVariant,
                marginHorizontal: 6,
              }}
            >
              <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Reset</Text>
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
              backgroundColor: theme.colors.primaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.35,
              shadowRadius: 12,
              transform: [{ scale }],
            }}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.onPrimaryContainer, marginBottom: 8, textAlign: 'center' }}>{phase.label}</Text>
              <Text style={{ fontSize: 56, fontWeight: '700', color: theme.colors.onPrimaryContainer, lineHeight: 60, textAlign: 'center' }}>{remainingDisplay}</Text>
              <Text style={{ fontSize: 10, color: theme.colors.onPrimaryContainer, opacity: 0.7, marginTop: 4, textAlign: 'center' }}>seconds</Text>
            </View>
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
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>{running ? 'Pause' : 'Resume'}</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>
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

  const [activeExercise, setActiveExercise] = useState<InterventionKey | 'breath_478' | null>(null);
  
  const startNow = (k: InterventionKey | 'breath_478') => {
    // For 4-7-8 breathing, show the breathing card
    if (k === 'breath_478') {
      setActiveExercise('breath_478');
      // Log the exercise start
      add.mutate({
        trigger_type: 'manual',
        reason: 'user_request',
        intervention: 'box_breath_60', // Use box_breath as the intervention type
        outcome: null,
        ctx: { type: '478_breathing' },
      });
      return;
    }
    
    // For other exercises, show guided steps
    setActiveExercise(k);
    add.mutate({
      trigger_type: 'manual',
      reason: 'user_request',
      intervention: k,
      outcome: null, // Set to null initially - will mark as completed after guided session
      ctx: {},
    });
  };
  
  const completeExercise = useCallback(async (k: InterventionKey | 'breath_478') => {
    // Mark as completed - create a new completed event
    try {
      await add.mutateAsync({
        trigger_type: 'manual',
        reason: 'user_request',
        intervention: k === 'breath_478' ? 'box_breath_60' : k,
        outcome: 'completed',
        ctx: k === 'breath_478' ? { type: '478_breathing' } : {},
      });
      
      // Record streak event
      const { recordStreakEvent } = await import('@/lib/streaks');
      await recordStreakEvent('mindfulness', new Date());
      
      setActiveExercise(null);
      Alert.alert('Completed', 'Great job! Your mindfulness session has been logged and added to your streak.');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to log session');
    }
  }, [add]);

  const theme = useTheme();
  
  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}
    >

      {(activeExercise === 'breath_478' || !activeExercise) && (
        <BreathingCard 
          reduceMotion={reduceMotionEnabled} 
          theme={theme} 
          onComplete={() => {
            if (activeExercise === 'breath_478') {
              completeExercise('breath_478');
            }
          }}
        />
      )}
      {activeExercise && activeExercise !== 'breath_478' && (
        <View style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 12 }}>
            {INTERVENTIONS[activeExercise].title}
          </Text>
          <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Follow the steps below. Take your time with each one.
          </Text>
          {INTERVENTIONS[activeExercise].steps.map((step, idx) => (
            <View key={idx} style={{ padding: 12, marginBottom: 8, borderRadius: 8, backgroundColor: theme.colors.surfaceVariant }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 4 }}>
                Step {idx + 1}
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant }}>{step}</Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => completeExercise(activeExercise)}
            style={{ marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center' }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '600', fontSize: 16 }}>Mark Complete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Health-based triggers */}
      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.onSurface }}>Health-based triggers</Text>
            <Text style={{ fontSize: 12, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>
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
          <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 4, color: theme.colors.onSurfaceVariant }}>
            Active • Monitoring your health data for triggers
          </Text>
        )}
      </View>

      {/* Quick start tiles */}
      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.onSurface }}>Mindfulness Now</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_CHOICES.map(k => {
            const title = k === 'breath_478' ? '4-7-8 Breathing' : INTERVENTIONS[k].title;
            const isActive = activeExercise === k;
            return (
              <TouchableOpacity 
                key={k} 
                onPress={() => startNow(k)} 
                style={{ 
                  paddingVertical: 10, 
                  paddingHorizontal: 12, 
                  borderRadius: 10, 
                  borderWidth: 1, 
                  borderColor: isActive ? theme.colors.primary : theme.colors.outlineVariant, 
                  backgroundColor: isActive ? theme.colors.primaryContainer : theme.colors.surface 
                }}
              >
                <Text style={{ color: isActive ? theme.colors.onPrimaryContainer : theme.colors.onSurface, fontWeight: isActive ? '600' : '400' }}>{title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {activeExercise === 'breath_478' && (
          <View style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: theme.colors.surfaceVariant }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 8 }}>
              Follow the breathing guide above. When finished:
            </Text>
            <TouchableOpacity
              onPress={() => completeExercise('breath_478')}
              style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: theme.colors.primary, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>Mark Complete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* NEW: Auto-Start Meditation rules */}
      <AutoStartMeditationCard />

      <View style={{ height: 1, backgroundColor: theme.colors.outlineVariant, marginVertical: 8 }} />

      {/* Streak + recent */}
      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.onSurface }}>Streak: {streak} day{streak===1?'':'s'}</Text>
      <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 8, color: theme.colors.onSurfaceVariant }}>Recent sessions</Text>

      <FlatList
        data={events}
        keyExtractor={(i) => i.id}
        refreshing={isLoading}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['mindfulness'] })}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: theme.colors.surface }}>
            <Text style={{ fontSize: 12, opacity: 0.6, color: theme.colors.onSurfaceVariant }}>{new Date(item.created_at).toLocaleString()}</Text>
            <Text style={{ fontSize: 16, marginTop: 4, color: theme.colors.onSurface }}>{item.intervention}</Text>
            <Text style={{ fontSize: 14, opacity: 0.8, color: theme.colors.onSurfaceVariant }}>via {item.trigger_type}{item.reason ? ` · ${item.reason}` : ''}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ opacity: 0.6, color: theme.colors.onSurfaceVariant }}>No sessions yet.</Text>}
      />

      <TouchableOpacity
        onPress={() => navigateToMood()} // quick tie-in; optional
        style={{ alignSelf: 'center', padding: 10 }}
      >
        <Text style={{ fontSize: 12, opacity: 0.6, color: theme.colors.onSurfaceVariant }}>Jump to Mood</Text>
      </TouchableOpacity>
    </ScrollView>
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
  const theme = useTheme();
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
    <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }}>
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.onSurface }}>Auto-Start Meditation</Text>

      {/* Type */}
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4, color: theme.colors.onSurface }}>Meditation Type</Text>
      <Picker selectedValue={type} onValueChange={(v) => setType(v)}>
        {MEDITATION_CATALOG.map(m => (
          <Picker.Item key={m.id} label={`${m.name} (${m.estMinutes}m)`} value={m.id} />
        ))}
      </Picker>

      {/* Mode */}
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 8, color: theme.colors.onSurface }}>Mode</Text>
      <Picker selectedValue={mode} onValueChange={(v) => setMode(v)}>
        <Picker.Item label="Fixed time (daily)" value="fixed_time" />
        <Picker.Item label="After wake (Health Connect)" value="after_wake" />
      </Picker>

      {/* Params */}
      {mode === 'fixed_time' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Text style={{ color: theme.colors.onSurface }}>Hour</Text>
          <TextInput
            keyboardType="number-pad"
            value={hour}
            onChangeText={setHour}
            placeholder="0-23"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 10, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }}
          />
          <Text style={{ color: theme.colors.onSurface }}>Minute</Text>
          <TextInput
            keyboardType="number-pad"
            value={minute}
            onChangeText={setMinute}
            placeholder="0-59"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 10, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }}
          />
        </View>
      ) : (
        <View style={{ marginTop: 6 }}>
          <Text style={{ marginBottom: 4, color: theme.colors.onSurface }}>Offset minutes after waking</Text>
          <TextInput
            keyboardType="number-pad"
            value={offset}
            onChangeText={setOffset}
            placeholder="e.g. 20"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 10, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }}
          />
          <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 6, color: theme.colors.onSurfaceVariant }}>
            Uses last sleep session from your health app (Apple Health on iOS, Google Fit on Android). If nothing recent, scheduling is skipped for today.
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <TouchableOpacity onPress={onSave} style={{ flex: 1, backgroundColor: theme.colors.primary, padding: 12, borderRadius: 12 }}>
          <Text style={{ color: theme.colors.onPrimary, textAlign: 'center', fontWeight: '600' }}>Save Rule</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={testNow} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant }}>
          <Text style={{ color: theme.colors.onSurface }}>Send Test</Text>
        </TouchableOpacity>
      </View>

      {/* Small hint */}
      <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 8, color: theme.colors.onSurfaceVariant }}>
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
