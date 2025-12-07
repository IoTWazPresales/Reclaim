// C:\Reclaim\app\src\screens\MindfulnessScreen.tsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Switch,
  Animated,
  Easing,
  AccessibilityInfo,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getUserSettings } from '@/lib/userSettings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme, TextInput as PaperTextInput } from 'react-native-paper';
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

// 4-7-8 breathing phases
const BREATH_PHASES_478 = [
  { key: 'inhale', label: 'Inhale', duration: 4 },
  { key: 'hold', label: 'Hold', duration: 7 },
  { key: 'exhale', label: 'Exhale', duration: 8 },
] as const;

// Box breathing phases (4-4-4-4)
const BOX_BREATH_PHASES = [
  { key: 'inhale', label: 'Inhale', duration: 4 },
  { key: 'hold1', label: 'Hold', duration: 4 },
  { key: 'exhale', label: 'Exhale', duration: 4 },
  { key: 'hold2', label: 'Hold', duration: 4 },
] as const;

// 4-7-8 Breathing Card
function BreathingCard478({ reduceMotion, theme, onComplete }: { reduceMotion: boolean; theme: any; onComplete?: () => void }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [remainingDisplay, setRemainingDisplay] = useState<number>(BREATH_PHASES_478[0].duration);
  const remainingRef = useRef<number>(BREATH_PHASES_478[0].duration);
  const scale = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hapticRef = useRef<NodeJS.Timeout | null>(null);

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });
  
  const hapticsEnabled = userSettingsQ.data?.hapticsEnabled ?? true;

  const phase = BREATH_PHASES_478[phaseIndex];
  const BREATH_PHASES = BREATH_PHASES_478;

  const updateRemaining = useCallback((value: number) => {
    // Show whole seconds, ticking down 4→1 (not skipping)
    const clamped = Math.max(0, Math.ceil(value));
    remainingRef.current = clamped;
    setRemainingDisplay(clamped);
  }, []);

  const advancePhase = useCallback(() => {
    setPhaseIndex((prev) => {
      const next = (prev + 1) % BREATH_PHASES.length;
      updateRemaining(BREATH_PHASES[next].duration);
      // If we've completed a full cycle (back to inhale from exhale), increment cycle count
      if (next === 0 && prev === BREATH_PHASES.length - 1) {
        setCycleCount((count) => {
          const newCount = count + 1;
          // Complete after 4 cycles (recommended practice)
          if (newCount >= 4 && onComplete) {
            setTimeout(() => {
              onComplete();
            }, 500);
            setRunning(false);
            setStarted(false);
          }
          return newCount;
        });
      }
      return next;
    });
  }, [updateRemaining, onComplete]);

  const resetCycle = useCallback(() => {
    setPhaseIndex(0);
    setCycleCount(0);
    setStarted(false);
    setRunning(false);
    updateRemaining(BREATH_PHASES[0].duration);
  }, [updateRemaining]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (hapticRef.current) {
        clearTimeout(hapticRef.current);
        hapticRef.current = null;
      }
      // Stop haptics and animation on unmount
      scale.stopAnimation();
    };
  }, [scale]);

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

  // Synchronized countdown and animation - single effect to keep them in sync (1s ticks)
  useEffect(() => {
    if (reduceMotion || !running || !started) {
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

    // Start countdown ticker - synchronized with animation (1s)
    const tick = () => {
      const nextRemaining = remainingRef.current - 1;
      if (nextRemaining <= 0) {
        updateRemaining(0);
        // Advance phase when countdown reaches 0
        advancePhase();
      } else {
        updateRemaining(nextRemaining);
        // Haptic feedback each second if enabled
        if (hapticsEnabled && !reduceMotion) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        // Accessibility announcement for countdown
        if (nextRemaining <= 3) {
          AccessibilityInfo.announceForAccessibility(`${phase.label}, ${nextRemaining} seconds remaining`);
        }
        timeoutRef.current = setTimeout(tick, 1000);
      }
    };

    // Initialize remaining at full duration and start ticking each second
    updateRemaining(phase.duration);
    // Accessibility announcement for phase start
    AccessibilityInfo.announceForAccessibility(`${phase.label} for ${phase.duration} seconds`);
    timeoutRef.current = setTimeout(tick, 1000);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (hapticRef.current) {
        clearTimeout(hapticRef.current);
        hapticRef.current = null;
      }
      scale.stopAnimation();
    };
  }, [phase.key, phase.duration, phase.label, reduceMotion, running, started, advancePhase, updateRemaining, hapticsEnabled]);

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
            accessibilityRole="text"
            accessibilityLabel={`${phase.label} phase, ${remainingDisplay} seconds remaining`}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.onPrimaryContainer, marginBottom: 8, textAlign: 'center' }}>{phase.label}</Text>
              <Text style={{ fontSize: 56, fontWeight: '700', color: theme.colors.onPrimaryContainer, lineHeight: 60, textAlign: 'center' }}>{remainingDisplay}</Text>
              <Text style={{ fontSize: 10, color: theme.colors.onPrimaryContainer, opacity: 0.7, marginTop: 4, textAlign: 'center' }}>seconds</Text>
            </View>
          </Animated.View>
          <TouchableOpacity
            onPress={() => {
              // If not started, start guided cycles (will auto-complete after 4)
              if (!started) {
                setPhaseIndex(0);
                setCycleCount(0);
                updateRemaining(BREATH_PHASES[0].duration);
                setStarted(true);
                setRunning(true);
              } else {
                // Toggle pause/resume
                setRunning((prev) => !prev);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={
              !started
                ? 'Start 4-7-8 breathing exercise'
                : running
                ? 'Pause breathing animation'
                : 'Resume breathing animation'
            }
            style={{
              marginTop: 16,
              paddingVertical: 12,
              paddingHorizontal: 18,
              borderRadius: 999,
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
              {!started ? 'Start' : running ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>
        Inhale for 4, hold for 7, and exhale for 8 seconds. Complete 4 cycles. Follow the pacing to settle your nervous system.
        {started && <Text style={{ fontWeight: '600' }}> Cycle {cycleCount + 1}/4</Text>}
      </Text>
    </View>
  );
}

// Box Breathing Card (4-4-4-4)
function BoxBreathingCard({ reduceMotion, theme, onComplete }: { reduceMotion: boolean; theme: any; onComplete?: () => void }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [remainingDisplay, setRemainingDisplay] = useState<number>(BOX_BREATH_PHASES[0].duration);
  const remainingRef = useRef<number>(BOX_BREATH_PHASES[0].duration);
  const scale = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hapticRef = useRef<NodeJS.Timeout | null>(null);

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });
  
  const hapticsEnabled = userSettingsQ.data?.hapticsEnabled ?? true;

  const phase = BOX_BREATH_PHASES[phaseIndex];

  const updateRemaining = useCallback((value: number) => {
    const clamped = Math.max(0, Math.ceil(value));
    remainingRef.current = clamped;
    setRemainingDisplay(clamped);
  }, []);

  const advancePhase = useCallback(() => {
    setPhaseIndex((prev) => {
      const next = (prev + 1) % BOX_BREATH_PHASES.length;
      updateRemaining(BOX_BREATH_PHASES[next].duration);
      // If we've completed a full cycle (back to inhale), increment cycle count
      if (next === 0) {
        setCycleCount((count) => {
          const newCount = count + 1;
          // Complete after 4 cycles
          if (newCount >= 4 && onComplete) {
            setTimeout(() => {
              onComplete();
            }, 500);
            setRunning(false);
            setStarted(false);
          }
          return newCount;
        });
      }
      return next;
    });
  }, [updateRemaining, onComplete]);

  const resetCycle = useCallback(() => {
    setPhaseIndex(0);
    setCycleCount(0);
    setStarted(false);
    setRunning(false);
    updateRemaining(BOX_BREATH_PHASES[0].duration);
  }, [updateRemaining]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (hapticRef.current) {
        clearTimeout(hapticRef.current);
        hapticRef.current = null;
      }
      scale.stopAnimation();
    };
  }, [scale]);

  useEffect(() => {
    if (reduceMotion) {
      setRunning(false);
      updateRemaining(BOX_BREATH_PHASES[phaseIndex].duration);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      setRunning(true);
    }
  }, [phaseIndex, reduceMotion, updateRemaining]);

  // Synchronized countdown and animation
  useEffect(() => {
    if (reduceMotion || !running || !started) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      scale.stopAnimation();
      scale.setValue(1);
      return;
    }

    let target = 1;
    let duration = phase.duration * 1000;
    
    if (phase.key === 'inhale' || phase.key === 'hold1') {
      // Inhale or first hold: grow from 1 to 1.3 over 4 seconds
      target = phase.key === 'inhale' ? 1.3 : 1.3;
      duration = 4000;
      scale.setValue(phase.key === 'inhale' ? 1 : 1.3);
    } else if (phase.key === 'exhale' || phase.key === 'hold2') {
      // Exhale or second hold: shrink from 1.3 to 0.9, or hold at 0.9
      target = phase.key === 'exhale' ? 0.9 : 0.9;
      duration = 4000;
      scale.setValue(phase.key === 'exhale' ? 1.3 : 0.9);
    }
    
    scale.stopAnimation(() => {
      Animated.timing(scale, {
        toValue: target,
        duration: duration,
        easing: phase.key === 'hold1' || phase.key === 'hold2' ? Easing.linear : Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    const tick = () => {
      const nextRemaining = remainingRef.current - 1;
      if (nextRemaining <= 0) {
        updateRemaining(0);
        advancePhase();
      } else {
        updateRemaining(nextRemaining);
        if (hapticsEnabled && !reduceMotion) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (nextRemaining <= 3) {
          AccessibilityInfo.announceForAccessibility(`${phase.label}, ${nextRemaining} seconds remaining`);
        }
        timeoutRef.current = setTimeout(tick, 1000);
      }
    };

    updateRemaining(phase.duration);
    AccessibilityInfo.announceForAccessibility(`${phase.label} for ${phase.duration} seconds`);
    timeoutRef.current = setTimeout(tick, 1000);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (hapticRef.current) {
        clearTimeout(hapticRef.current);
        hapticRef.current = null;
      }
      scale.stopAnimation();
    };
  }, [phase.key, phase.duration, phase.label, reduceMotion, running, started, advancePhase, updateRemaining, hapticsEnabled]);

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
        Box Breathing (4-4-4-4)
      </Text>
      {reduceMotion ? (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            {BOX_BREATH_PHASES.map((p, idx) => (
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
            accessibilityRole="text"
            accessibilityLabel={`${phase.label} phase, ${remainingDisplay} seconds remaining`}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.onPrimaryContainer, marginBottom: 8, textAlign: 'center' }}>{phase.label}</Text>
              <Text style={{ fontSize: 56, fontWeight: '700', color: theme.colors.onPrimaryContainer, lineHeight: 60, textAlign: 'center' }}>{remainingDisplay}</Text>
              <Text style={{ fontSize: 10, color: theme.colors.onPrimaryContainer, opacity: 0.7, marginTop: 4, textAlign: 'center' }}>seconds</Text>
            </View>
          </Animated.View>
          <TouchableOpacity
            onPress={() => {
              if (!started) {
                setPhaseIndex(0);
                setCycleCount(0);
                updateRemaining(BOX_BREATH_PHASES[0].duration);
                setStarted(true);
                setRunning(true);
              } else {
                setRunning((prev) => !prev);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={
              !started
                ? 'Start box breathing exercise'
                : running
                ? 'Pause breathing animation'
                : 'Resume breathing animation'
            }
            style={{
              marginTop: 16,
              paddingVertical: 12,
              paddingHorizontal: 18,
              borderRadius: 999,
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
              {!started ? 'Start' : running ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>
        Inhale 4, hold 4, exhale 4, hold 4. Complete 4 cycles. Follow the pacing for balance and focus.
        {started && <Text style={{ fontWeight: '600' }}> Cycle {cycleCount + 1}/4</Text>}
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
    queryFn: async () => {
      try {
        const result = await listMindfulnessEvents(30);
        return Array.isArray(result) ? result : [];
      } catch (error: any) {
        console.warn('MindfulnessScreen: listMindfulnessEvents error:', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
    initialData: [], // Prevent undefined crashes
    placeholderData: [], // Prevent undefined crashes
  });

  const add = useMutation({
    mutationFn: (payload: Parameters<typeof logMindfulnessEvent>[0]) => logMindfulnessEvent(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mindfulness'] }),
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to log session'),
  });

  const streak = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) return 0;
    const days = new Set(events.map(e => e?.created_at?.slice(0,10)).filter(Boolean));
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
    // Reset any previous exercise state by setting to null first
    setActiveExercise(null);
    // Small delay to allow state reset, then set new exercise
    setTimeout(() => {
      // For 4-7-8 breathing, show the 4-7-8 breathing card
      if (k === 'breath_478') {
        setActiveExercise('breath_478');
        add.mutate({
          trigger_type: 'manual',
          reason: 'user_request',
          intervention: 'box_breath_60', // Use box_breath as the intervention type for logging
          outcome: null,
          ctx: { type: '478_breathing' },
        });
        return;
      }
      
      // For box breathing, show the box breathing card
      if (k === 'box_breath_60') {
        setActiveExercise('box_breath_60');
        add.mutate({
          trigger_type: 'manual',
          reason: 'user_request',
          intervention: 'box_breath_60',
          outcome: null,
          ctx: { type: 'box_breathing' },
        });
        return;
      }
      
      // For other exercises (non-breathing), show guided steps
      setActiveExercise(k);
      add.mutate({
        trigger_type: 'manual',
        reason: 'user_request',
        intervention: k,
        outcome: null, // Set to null initially - will mark as completed after guided session
        ctx: {},
      });
    }, 0);
  };
  
  const completeExercise = useCallback(async (k: InterventionKey | 'breath_478') => {
    // Mark as completed - create a new completed event
    try {
      const intervention = k === 'breath_478' ? 'box_breath_60' : k;
      const ctx = k === 'breath_478' ? { type: '478_breathing' } : (k === 'box_breath_60' ? { type: 'box_breathing' } : {});
      await add.mutateAsync({
        trigger_type: 'manual',
        reason: 'user_request',
        intervention: intervention,
        outcome: 'completed',
        ctx: ctx,
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
  
  // Reset active exercise when component unmounts
  useEffect(() => {
    return () => {
      setActiveExercise(null);
    };
  }, []);
  
  // Header component for FlatList
  const ListHeader = () => (
    <>
      {activeExercise === 'breath_478' && (
        <BreathingCard478 
          reduceMotion={reduceMotionEnabled} 
          theme={theme} 
          onComplete={() => completeExercise('breath_478')}
        />
      )}
      {activeExercise === 'box_breath_60' && (
        <BoxBreathingCard 
          reduceMotion={reduceMotionEnabled} 
          theme={theme} 
          onComplete={() => completeExercise('box_breath_60')}
        />
      )}
      {activeExercise && activeExercise !== 'breath_478' && activeExercise !== 'box_breath_60' && (
        <GuidedExercise
          title={INTERVENTIONS[activeExercise].title}
          steps={INTERVENTIONS[activeExercise].steps}
          theme={theme}
          onComplete={() => completeExercise(activeExercise)}
        />
      )}

      {/* Health-based triggers */}
      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface, marginBottom: 16 }}>
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
      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface, marginBottom: 16 }}>
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

      <View style={{ height: 1, backgroundColor: theme.colors.outlineVariant, marginVertical: 16 }} />

      {/* Streak + recent */}
      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 8 }}>Streak: {streak} day{streak===1?'':'s'}</Text>
      <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 8, color: theme.colors.onSurfaceVariant }}>Recent sessions</Text>
    </>
  );

  // Footer component for FlatList
  const ListFooter = () => (
    <TouchableOpacity
      onPress={() => navigateToMood()}
      style={{ alignSelf: 'center', padding: 10, marginTop: 16 }}
    >
      <Text style={{ fontSize: 12, opacity: 0.6, color: theme.colors.onSurfaceVariant }}>Jump to Mood</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={events}
        keyExtractor={(i) => i.id}
        refreshing={isLoading}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['mindfulness'] })}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: theme.colors.surface }}>
            <Text style={{ fontSize: 12, opacity: 0.6, color: theme.colors.onSurfaceVariant }}>{new Date(item.created_at).toLocaleString()}</Text>
            <Text style={{ fontSize: 16, marginTop: 4, color: theme.colors.onSurface }}>{item.intervention}</Text>
            <Text style={{ fontSize: 14, opacity: 0.8, color: theme.colors.onSurfaceVariant }}>via {item.trigger_type}{item.reason ? ` · ${item.reason}` : ''}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ opacity: 0.6, color: theme.colors.onSurfaceVariant }}>No sessions yet.</Text>}
      />
    </View>
  );
}

// Non-breathing exercises: user-controlled navigation, no timers
function GuidedExercise({ title, steps, theme, onComplete }: { title: string; steps: string[]; theme: any; onComplete: () => void }) {
  const [idx, setIdx] = React.useState(0);

  // Check if this is a breathing exercise (should use breathing card instead)
  const isBreathing = title.toLowerCase().includes('breathing') || title.toLowerCase().includes('breath');

  return (
    <View style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 12 }}>{title}</Text>
      <View style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.surfaceVariant }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 4 }}>Step {idx + 1} of {steps.length}</Text>
        <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{steps[idx]}</Text>
        <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, opacity: 0.7 }}>Go at your own pace</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TouchableOpacity 
          onPress={() => setIdx(Math.max(0, idx - 1))} 
          accessibilityRole="button"
          accessibilityLabel="Go to previous step"
          disabled={idx === 0}
          style={{ 
            padding: 12, 
            borderRadius: 10, 
            borderWidth: 1, 
            borderColor: theme.colors.outlineVariant,
            backgroundColor: idx === 0 ? theme.colors.surfaceVariant : theme.colors.surface,
            opacity: idx === 0 ? 0.5 : 1,
          }}
        >
          <Text style={{ color: idx === 0 ? theme.colors.onSurfaceVariant : theme.colors.onSurface }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            if (idx < steps.length - 1) {
              setIdx(idx + 1);
            } else {
              onComplete();
            }
          }} 
          accessibilityRole="button"
          accessibilityLabel={idx < steps.length - 1 ? 'Go to next step' : 'Finish exercise'}
          style={{ 
            flex: 1,
            padding: 12, 
            borderRadius: 10, 
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>{idx < steps.length - 1 ? 'Next when ready' : 'Finish'}</Text>
        </TouchableOpacity>
      </View>
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

function clampInt(s: string, min: number, max: number): number {
  const parsed = parseInt(s, 10);
  if (isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function labelFor(type: MeditationType): string {
  const med = MEDITATION_CATALOG.find(m => m.id === type);
  return med?.name ?? type;
}

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
    // Test notification sent (removed alert for cleaner UX)
  };

  return (
    <View
      style={{
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 8,
          color: theme.colors.onSurface,
        }}
      >
        Auto-Start Meditation
      </Text>

      {/* Type */}
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          marginBottom: 4,
          color: theme.colors.onSurface,
        }}
      >
        Meditation Type
      </Text>
      <Picker selectedValue={type} onValueChange={(v) => setType(v)}>
        {MEDITATION_CATALOG.map((m) => (
          <Picker.Item key={m.id} label={`${m.name} (${m.estMinutes}m)`} value={m.id} />
        ))}
      </Picker>

      {/* Mode toggle */}
      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <TouchableOpacity
          onPress={() => setMode('fixed_time')}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: mode === 'fixed_time' ? theme.colors.primary : theme.colors.outlineVariant,
            backgroundColor: mode === 'fixed_time' ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
            marginRight: 6,
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              color: mode === 'fixed_time' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
              fontWeight: '600',
            }}
          >
            Daily time
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('after_wake')}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: mode === 'after_wake' ? theme.colors.primary : theme.colors.outlineVariant,
            backgroundColor: mode === 'after_wake' ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
            marginLeft: 6,
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              color: mode === 'after_wake' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
              fontWeight: '600',
            }}
          >
            After wake
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inputs */}
      {mode === 'fixed_time' ? (
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <PaperTextInput
            mode="outlined"
            label="Hour (0–23)"
            keyboardType="number-pad"
            value={hour}
            onChangeText={setHour}
            style={{ flex: 1, marginRight: 8 }}
          />
          <PaperTextInput
            mode="outlined"
            label="Minute (0–59)"
            keyboardType="number-pad"
            value={minute}
            onChangeText={setMinute}
            style={{ flex: 1 }}
          />
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          <PaperTextInput
            mode="outlined"
            label="Minutes after wake"
            keyboardType="number-pad"
            value={offset}
            onChangeText={setOffset}
          />
        </View>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={testNow}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            marginRight: 8,
          }}
        >
          <Text style={{ color: theme.colors.onSurface }}>Send test</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>Save rule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}