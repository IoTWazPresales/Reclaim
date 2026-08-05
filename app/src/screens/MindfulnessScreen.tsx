// C:\Reclaim\app\src\screens\MindfulnessScreen.tsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Platform,
  TouchableOpacity,
  Alert,
  Switch,
  Animated,
  Easing,
  AccessibilityInfo,
  ScrollView,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getUserSettings } from '@/lib/userSettings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { useTheme, TextInput as PaperTextInput, Card, Dialog, RadioButton, Portal, Button as PaperButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';
import {
  reclaimPrimaryCapsuleButton,
  reclaimSecondaryCapsuleButton,
  reclaimGhostCapsuleButton,
} from '@/theme/reclaimVisualLanguage';
import { RECLAIM_SCREEN_SECTION_GAP, reclaimStandardScreenScroll } from '@/theme/reclaimScreenLayout';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { listMindfulnessEvents, logMindfulnessEvent } from '@/lib/api';
import { INTERVENTIONS, formatInterventionLabel, type InterventionKey } from '@/lib/mindfulness';
import { scheduleNotificationAsync } from 'expo-notifications';
import { navigateToMood } from '@/navigation/nav';

// NEW: meditation auto-start imports
import { MEDITATION_CATALOG, type MeditationType } from '@/lib/meditations';
import { loadMeditationSettings, saveMeditationSettings } from '@/lib/meditationSettings';
import { scheduleMeditationAtTime, scheduleMeditationAfterWake } from '@/hooks/useMeditationScheduler';
import { useAuth } from '@/providers/AuthProvider';
import { BreathOrb } from '@/components/mindfulness/BreathOrb';
import { MindfulnessToolTile } from '@/components/mindfulness/MindfulnessToolTile';
import { FirstVisitCoach } from '@/components/ui/FirstVisitCoach';
import {
  dismissMindfulnessFirstVisitGuide,
  isMindfulnessFirstVisitGuideDismissed,
} from '@/lib/firstRunGuide';
import { reclaimUtilityCardSurface } from '@/theme/reclaimVisualLanguage';
import { devTestHrNudgeSynthetic } from '@/lib/health/notificationTriggers';
import { loadReactiveTriggersEnabled, saveReactiveTriggersEnabled } from '@/lib/mindfulness/reactiveTriggersPreference';

// ✅ NEW: source serializer for test notification + correct kind typing
import { type MeditationSource, serializeMeditationSource } from '@/lib/meditationSources';

function CardHeader({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: any;
  right?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <FeatureCardHeader title={title} subtitle={subtitle} icon={icon} />
      </View>
      {right ? <View style={{ marginLeft: 12 }}>{right}</View> : null}
    </View>
  );
}

// Include 4-7-8 breathing as 'breath_478' - we'll use a special key
const QUICK_CHOICES: (InterventionKey | 'breath_478')[] = [
  'breath_478',
  'box_breath_60',
  'five_senses',
  'reality_check',
  'urge_surf',
];

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

/* ──────────────────────────────────────────────────────────────
   4-7-8 Breathing Card (content only)
   ────────────────────────────────────────────────────────────── */
function BreathingCard478({
  reduceMotion,
  theme,
  onComplete,
}: {
  reduceMotion: boolean;
  theme: any;
  onComplete?: () => void;
}) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [remainingDisplay, setRemainingDisplay] = useState<number>(BREATH_PHASES_478[0].duration);
  const remainingRef = useRef<number>(BREATH_PHASES_478[0].duration);
  const scale = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  const hapticsEnabled = userSettingsQ.data?.hapticsEnabled ?? true;

  const phase = BREATH_PHASES_478[phaseIndex];
  const BREATH_PHASES = BREATH_PHASES_478;

  const updateRemaining = useCallback((value: number) => {
    const clamped = Math.max(0, Math.ceil(value));
    remainingRef.current = clamped;
    setRemainingDisplay(clamped);
  }, []);

  const advancePhase = useCallback(() => {
    setPhaseIndex((prev) => {
      const next = (prev + 1) % BREATH_PHASES.length;
      updateRemaining(BREATH_PHASES[next].duration);

      if (next === 0 && prev === BREATH_PHASES.length - 1) {
        setCycleCount((count) => {
          const newCount = count + 1;
          if (newCount >= 4 && onComplete) {
            setTimeout(() => onComplete(), 500);
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hapticRef.current) clearTimeout(hapticRef.current);
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

    if (phase.key === 'inhale') {
      target = 1.35;
      duration = 4000;
      scale.setValue(1);
    } else if (phase.key === 'hold') {
      target = 1.35;
      duration = 7000;
      scale.setValue(1.35);
    } else if (phase.key === 'exhale') {
      target = 0.85;
      duration = 8000;
      scale.setValue(1.35);
    }

    scale.stopAnimation(() => {
      Animated.timing(scale, {
        toValue: target,
        duration,
        easing: phase.key === 'hold' ? Easing.linear : Easing.inOut(Easing.ease),
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hapticRef.current) clearTimeout(hapticRef.current);
      scale.stopAnimation();
    };
  }, [
    phase.key,
    phase.duration,
    phase.label,
    reduceMotion,
    running,
    started,
    advancePhase,
    updateRemaining,
    hapticsEnabled,
    scale,
  ]);

  return (
    <View>
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

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 10 }}>
            <Button mode="contained" onPress={advancePhase} accessibilityLabel="Advance to the next breathing phase" style={{ borderRadius: 9999 }}>
              Next step
            </Button>
            <Button mode="outlined" onPress={resetCycle} accessibilityLabel="Reset breathing cycle" style={{ borderRadius: 9999 }}>
              Reset
            </Button>
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
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.onPrimaryContainer, marginBottom: 8, textAlign: 'center' }}>
                {phase.label}
              </Text>
              <Text style={{ fontSize: 56, fontWeight: '700', color: theme.colors.onPrimaryContainer, lineHeight: 60, textAlign: 'center' }}>
                {remainingDisplay}
              </Text>
              <Text style={{ fontSize: 10, color: theme.colors.onPrimaryContainer, opacity: 0.7, marginTop: 4, textAlign: 'center' }}>
                seconds
              </Text>
            </View>
          </Animated.View>

          <Button
            mode="contained"
            onPress={() => {
              if (!started) {
                setPhaseIndex(0);
                setCycleCount(0);
                updateRemaining(BREATH_PHASES[0].duration);
                setStarted(true);
                setRunning(true);
              } else {
                setRunning((prev) => !prev);
              }
            }}
            accessibilityLabel={!started ? 'Start 4-7-8 breathing exercise' : running ? 'Pause breathing animation' : 'Resume breathing animation'}
            style={{ marginTop: 16, borderRadius: 9999 }}
          >
            {!started ? 'Start' : running ? 'Pause' : 'Resume'}
          </Button>
        </View>
      )}

      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>
        Inhale for 4, hold for 7, and exhale for 8 seconds. Complete 4 cycles.
        {started && <Text style={{ fontWeight: '600' }}> Cycle {cycleCount + 1}/4</Text>}
      </Text>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   Box Breathing Card (content only)
   ────────────────────────────────────────────────────────────── */
function BoxBreathingCard({
  reduceMotion,
  theme,
  onComplete,
}: {
  reduceMotion: boolean;
  theme: any;
  onComplete?: () => void;
}) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [remainingDisplay, setRemainingDisplay] = useState<number>(BOX_BREATH_PHASES[0].duration);
  const remainingRef = useRef<number>(BOX_BREATH_PHASES[0].duration);
  const scale = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      if (next === 0) {
        setCycleCount((count) => {
          const newCount = count + 1;
          if (newCount >= 4 && onComplete) {
            setTimeout(() => onComplete(), 500);
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hapticRef.current) clearTimeout(hapticRef.current);
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
      target = 1.3;
      duration = 4000;
      scale.setValue(phase.key === 'inhale' ? 1 : 1.3);
    } else if (phase.key === 'exhale' || phase.key === 'hold2') {
      target = 0.9;
      duration = 4000;
      scale.setValue(phase.key === 'exhale' ? 1.3 : 0.9);
    }

    scale.stopAnimation(() => {
      Animated.timing(scale, {
        toValue: target,
        duration,
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hapticRef.current) clearTimeout(hapticRef.current);
      scale.stopAnimation();
    };
  }, [
    phase.key,
    phase.duration,
    phase.label,
    reduceMotion,
    running,
    started,
    advancePhase,
    updateRemaining,
    hapticsEnabled,
    scale,
  ]);

  return (
    <View>
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

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 10 }}>
            <Button mode="contained" onPress={advancePhase} accessibilityLabel="Advance to the next breathing phase" style={{ borderRadius: 9999 }}>
              Next step
            </Button>
            <Button mode="outlined" onPress={resetCycle} accessibilityLabel="Reset breathing cycle" style={{ borderRadius: 9999 }}>
              Reset
            </Button>
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
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.onPrimaryContainer, marginBottom: 8, textAlign: 'center' }}>
                {phase.label}
              </Text>
              <Text style={{ fontSize: 56, fontWeight: '700', color: theme.colors.onPrimaryContainer, lineHeight: 60, textAlign: 'center' }}>
                {remainingDisplay}
              </Text>
              <Text style={{ fontSize: 10, color: theme.colors.onPrimaryContainer, opacity: 0.7, marginTop: 4, textAlign: 'center' }}>
                seconds
              </Text>
            </View>
          </Animated.View>

          <Button
            mode="contained"
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
            accessibilityLabel={!started ? 'Start box breathing exercise' : running ? 'Pause breathing animation' : 'Resume breathing animation'}
            style={{ marginTop: 16, borderRadius: 9999 }}
          >
            {!started ? 'Start' : running ? 'Pause' : 'Resume'}
          </Button>
        </View>
      )}

      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>
        Inhale 4, hold 4, exhale 4, hold 4. Complete 4 cycles.
        {started && <Text style={{ fontWeight: '600' }}> Cycle {cycleCount + 1}/4</Text>}
      </Text>
    </View>
  );
}

// Non-breathing exercises: user-controlled navigation, no timers (content-only)
function GuidedExercise({
  title,
  steps,
  theme,
  onComplete,
}: {
  title: string;
  steps: string[];
  theme: any;
  onComplete: () => void;
}) {
  const [idx, setIdx] = React.useState(0);

  return (
    <View>
      <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.colors.surfaceVariant }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 4 }}>
          Step {idx + 1} of {steps.length}
        </Text>
        <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{steps[idx]}</Text>
        <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>Go at your own pace</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Button
          mode="outlined"
          onPress={() => setIdx(Math.max(0, idx - 1))}
          accessibilityLabel="Go to previous step"
          disabled={idx === 0}
          style={{ borderRadius: 9999 }}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={() => {
            if (idx < steps.length - 1) setIdx(idx + 1);
            else onComplete();
          }}
          accessibilityLabel={idx < steps.length - 1 ? 'Go to next step' : 'Complete exercise'}
          style={{ borderRadius: 9999, flex: 1 }}
        >
          {idx < steps.length - 1 ? 'Next when ready' : 'Finish'}
        </Button>
      </View>

      <Text style={{ marginTop: 10, fontSize: 12, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>{title}</Text>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   Auto-Start Meditation Content
   ────────────────────────────────────────────────────────────── */
type FixedRule = { mode: 'fixed_time'; type: MeditationType; hour: number; minute: number };
type WakeRule = { mode: 'after_wake'; type: MeditationType; offsetMinutes: number };

function clampInt(s: string, min: number, max: number): number {
  const parsed = parseInt(s, 10);
  if (isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
function labelFor(type: MeditationType): string {
  const med = MEDITATION_CATALOG.find((m) => m.id === type);
  return med?.name ?? type;
}

function AutoStartMeditationContent() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  // Sync existing rules to intents on mount (migration: ensures rules from before intent cutover get scheduled)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const settings = await loadMeditationSettings();
        const rules = settings?.rules ?? [];
        if (rules.length === 0) return;
        for (const rule of rules) {
          if (!mounted) return;
          const src: MeditationSource = { kind: 'script', scriptId: rule.type };
          if (rule.mode === 'fixed_time') {
            await scheduleMeditationAtTime(src, rule.hour, rule.minute, rule, userId);
          } else {
            await scheduleMeditationAfterWake(src, rule.offsetMinutes, rule, userId);
          }
        }
      } catch {
        // non-blocking
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const [mode, setMode] = useState<'fixed_time' | 'after_wake'>('fixed_time');
  const [type, setType] = useState<MeditationType>('body_scan');
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const [hour, setHour] = useState('7');
  const [minute, setMinute] = useState('30');
  const [offset, setOffset] = useState('20');

  const pickerBg = theme.colors.surfaceVariant;
  const pickerText = theme.colors.onSurface;

  const onSave = async () => {
    try {
      const settings = await loadMeditationSettings();
      const nextRules = settings.rules.slice();

      let newRule: FixedRule | WakeRule;

      const source: MeditationSource = { kind: 'script', scriptId: type };

      if (mode === 'fixed_time') {
        const hourNum = clampInt(hour, 0, 23);
        const minuteNum = clampInt(minute, 0, 59);
        newRule = { mode: 'fixed_time', type, hour: hourNum, minute: minuteNum };

        const withoutDup = nextRules.filter((r) => JSON.stringify(r) !== JSON.stringify(newRule));
        await saveMeditationSettings({ rules: [...withoutDup, newRule] });

        await scheduleMeditationAtTime(source, hourNum, minuteNum, newRule, userId);

        Alert.alert('Saved', `Daily ${labelFor(type)} at ${pad2(hourNum)}:${pad2(minuteNum)} scheduled.`);
      } else {
        const offsetNum = clampInt(offset, 0, 240);
        newRule = { mode: 'after_wake', type, offsetMinutes: offsetNum };

        const withoutDup = nextRules.filter((r) => JSON.stringify(r) !== JSON.stringify(newRule));
        await saveMeditationSettings({ rules: [...withoutDup, newRule] });

        const id = await scheduleMeditationAfterWake(source, offsetNum, newRule, userId);

        Alert.alert(
          'Saved',
          id ? `After-wake ${labelFor(type)} scheduled for today.` : 'No fresh sleep end found\u2014will try again next launch.'
        );
      }
    } catch (error) {
      if (__DEV__) console.warn('[MindfulnessScreen] onSave failed:', error);
      Alert.alert('Save failed', 'Your meditation settings could not be saved. Please try again.');
    }
  };

  const testNow = async () => {
    // ✅ Test using the SAME deep link format as the scheduler: ?source=
    const src: MeditationSource = { kind: 'script', scriptId: type };
    const encoded = encodeURIComponent(serializeMeditationSource(src));

    await scheduleNotificationAsync({
      content: {
        title: 'Test Meditation',
        body: `Open ${labelFor(type)} now`,
        data: { url: `reclaim://meditation?source=${encoded}&autoStart=true` },
      },
      trigger: null,
    });
  };

  return (
    <View>
      <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 6, color: theme.colors.onSurface }}>Meditation type</Text>

      <TouchableOpacity
        onPress={() => setTypePickerOpen(true)}
        activeOpacity={0.7}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          backgroundColor: pickerBg,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel={`Meditation type: ${MEDITATION_CATALOG.find(m => m.id === type)?.name ?? type}`}
      >
        <Text style={{ color: pickerText, fontSize: 15 }}>
          {MEDITATION_CATALOG.find(m => m.id === type)?.name ?? type}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>
      <Portal>
        <Dialog visible={typePickerOpen} onDismiss={() => setTypePickerOpen(false)} style={{ maxHeight: '70%' }}>
          <Dialog.Title>Meditation type</Dialog.Title>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <ScrollView>
              <RadioButton.Group
                value={type}
                onValueChange={(v) => {
                  setType(v as MeditationType);
                  setTypePickerOpen(false);
                }}
              >
                {MEDITATION_CATALOG.map((m) => (
                  <RadioButton.Item key={m.id} label={`${m.name} (${m.estMinutes}m)`} value={m.id} />
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <PaperButton onPress={() => setTypePickerOpen(false)}>Cancel</PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Mode toggle */}
      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <TouchableOpacity
          onPress={() => setMode('fixed_time')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
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
              fontWeight: '700',
            }}
          >
            Daily time
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode('after_wake')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
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
              fontWeight: '700',
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
            onChangeText={(t: string) => setHour(t)}
            style={{ flex: 1, marginRight: 8 }}
          />
          <PaperTextInput
            mode="outlined"
            label="Minute (0–59)"
            keyboardType="number-pad"
            value={minute}
            onChangeText={(t: string) => setMinute(t)}
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
            onChangeText={(t: string) => setOffset(t)}
          />
        </View>
      )}

      <Text style={{ marginTop: 10, fontSize: 12, color: theme.colors.onSurfaceVariant }}>
        {Platform.OS === 'android'
          ? 'Tip: “After wake” uses your latest sleep end time from Health Connect and schedules a one-shot for today. The reminder uses alarm-style timing and sound; tap it to open the app and the meditation starts immediately (sound-guided).'
          : 'Tip: “After wake” uses your latest sleep end time from Apple Health when connected, and schedules a one-shot for today. The reminder uses alarm-style timing and sound; tap it to open the app and the meditation starts immediately (sound-guided).'}
      </Text>

      {/* Actions */}
      <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={testNow}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            marginRight: 8,
          }}
        >
          <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Send test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSave}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 12,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '800' }}>Save rule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MindfulnessScreen() {
  const qc = useQueryClient();
  const theme = useTheme();
  const appTheme = useAppTheme();
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme), [appTheme]);
  const { session } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const breathOrbRef = useRef<View>(null);
  const deepLinkHandledRef = useRef(false);
  const [showMindfulnessFirstVisitGuide, setShowMindfulnessFirstVisitGuide] = useState(false);

  const route = useRoute();
  const deepLinkParams = (route.params ?? {}) as {
    autoStart?: boolean | 'true' | 'false' | string;
    intervention?: string;
  };

  const cardRadius = 16;
  const sectionSpacing = RECLAIM_SCREEN_SECTION_GAP;
  const cardSurface = theme.colors.surface;

  const [reactiveOn, setReactiveOn] = useState(false);
  const [reactivePrefLoaded, setReactivePrefLoaded] = useState(false);
  const reactiveLocalTouchedRef = useRef(false);

  useEffect(() => {
    loadReactiveTriggersEnabled()
      .then((on) => {
        if (!reactiveLocalTouchedRef.current) {
          setReactiveOn(on);
        }
        setReactivePrefLoaded(true);
      })
      .catch(() => setReactivePrefLoaded(true));
  }, []);

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
      // @ts-ignore - RN typing differs by version
      sub?.remove?.();
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
    initialData: [],
    placeholderData: [],
  });

  const add = useMutation({
    mutationFn: (payload: Parameters<typeof logMindfulnessEvent>[0]) => logMindfulnessEvent(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mindfulness'] }),
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to log session'),
  });

  const streak = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) return 0;
    const days = new Set(events.map((e) => e?.created_at?.slice(0, 10)).filter(Boolean));
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) s++;
      else break;
    }
    return s;
  }, [events]);

  const [activeExercise, setActiveExercise] = useState<InterventionKey | 'breath_478' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const uid = session?.user?.id;
    if (!uid) {
      setShowMindfulnessFirstVisitGuide(false);
      return;
    }
    void isMindfulnessFirstVisitGuideDismissed(uid).then((dismissed) => {
      if (!cancelled) setShowMindfulnessFirstVisitGuide(!dismissed);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const handleDismissMindfulnessFirstVisitGuide = useCallback(async () => {
    setShowMindfulnessFirstVisitGuide(false);
    await dismissMindfulnessFirstVisitGuide(session?.user?.id);
  }, [session?.user?.id]);

  const handleMindfulnessCoachShowMe = useCallback(() => {
    const node = breathOrbRef.current;
    const content = scrollContentRef.current;
    const scroll = scrollRef.current;
    if (node && content && scroll) {
      node.measureLayout(
        content,
        (_x, y) => scroll.scrollTo({ y: Math.max(0, y - 12), animated: true }),
        () => {},
      );
    }
    void handleDismissMindfulnessFirstVisitGuide();
  }, [handleDismissMindfulnessFirstVisitGuide]);

  useEffect(() => {
    return () => setActiveExercise(null);
  }, []);

  const startNow = (k: InterventionKey | 'breath_478') => {
    setActiveExercise(null);
    setTimeout(() => {
      if (k === 'breath_478') {
        setActiveExercise('breath_478');
        add.mutate({
          trigger_type: 'manual',
          reason: 'user_request',
          intervention: 'box_breath_60',
          outcome: null,
          ctx: { type: '478_breathing' },
        });
        return;
      }

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

      setActiveExercise(k);
      add.mutate({
        trigger_type: 'manual',
        reason: 'user_request',
        intervention: k,
        outcome: null,
        ctx: {},
      });
    }, 0);
  };

  // Deep link: reclaim://mindfulness?intervention=…&autoStart=true (wellness / HEALTH_TRIGGER)
  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    const auto =
      deepLinkParams.autoStart === true ||
      (typeof deepLinkParams.autoStart === 'string' &&
        ['true', '1', 'yes'].includes(deepLinkParams.autoStart.toLowerCase()));
    if (!auto) return;

    const raw = deepLinkParams.intervention;
    let key: InterventionKey | 'breath_478' = 'box_breath_60';
    if (raw === 'breath_478') key = 'breath_478';
    else if (typeof raw === 'string' && raw in INTERVENTIONS) key = raw as InterventionKey;

    deepLinkHandledRef.current = true;
    startNow(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link; startNow is stable enough via ref guard
  }, [deepLinkParams.autoStart, deepLinkParams.intervention]);

  // Attach to lock-screen Start session (Option B) when opening the screen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { loadMindfulnessActiveSession } = await import('@/lib/mindfulness/mindfulnessSessionState');
        const active = await loadMindfulnessActiveSession();
        if (cancelled || !active || activeExercise) return;
        setActiveExercise(active.intervention);
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot attach on mount
  }, []);

  const completeExercise = useCallback(
    async (k: InterventionKey | 'breath_478') => {
      try {
        const intervention = k === 'breath_478' ? 'box_breath_60' : k;
        const ctx =
          k === 'breath_478' ? { type: '478_breathing' } : k === 'box_breath_60' ? { type: 'box_breathing' } : {};

        const { loadMindfulnessActiveSession } = await import('@/lib/mindfulness/mindfulnessSessionState');
        const lockSession = await loadMindfulnessActiveSession();
        if (lockSession) {
          const { completeMindfulnessSessionFromRuntime } = await import(
            '@/lib/notifications/mindfulnessNotificationActions'
          );
          await completeMindfulnessSessionFromRuntime('ui');
        } else {
          await add.mutateAsync({
            trigger_type: 'manual',
            reason: 'user_request',
            intervention,
            outcome: 'completed',
            ctx,
          });

          const { recordStreakEvent } = await import('@/lib/streaks');
          await recordStreakEvent('mindfulness', new Date());
        }

        setActiveExercise(null);
        Alert.alert('Completed', 'Great job! Your mindfulness session has been logged and added to your streak.');
      } catch (error: any) {
        Alert.alert('Error', error?.message ?? 'Failed to log session');
      }
    },
    [add]
  );

  const latest = useMemo(() => {
    if (!events?.length) return null;
    const sorted = [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted[0] ?? null;
  }, [events]);

  const latestText = useMemo(() => {
    if (!latest?.created_at) return 'No sessions yet. A 2-minute reset counts.';
    try {
      const d = new Date(latest.created_at);
      return `Last session: ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Last session logged.';
    }
  }, [latest]);

  const renderActiveExerciseContent = () => {
    if (!activeExercise) return null;

    if (activeExercise === 'breath_478') {
      return (
        <View>
          <BreathingCard478 reduceMotion={reduceMotionEnabled} theme={theme} onComplete={() => completeExercise('breath_478')} />
          <TouchableOpacity
            onPress={() => completeExercise('breath_478')}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              alignSelf: 'center',
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '800' }}>Mark complete</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeExercise === 'box_breath_60') {
      return (
        <View>
          <BoxBreathingCard reduceMotion={reduceMotionEnabled} theme={theme} onComplete={() => completeExercise('box_breath_60')} />
          <TouchableOpacity
            onPress={() => completeExercise('box_breath_60')}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              alignSelf: 'center',
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '800' }}>Mark complete</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <GuidedExercise
        title={INTERVENTIONS[activeExercise].title}
        steps={INTERVENTIONS[activeExercise].steps}
        theme={theme}
        onComplete={() => completeExercise(activeExercise)}
      />
    );
  };

  const renderQuickChoiceTitle = (k: InterventionKey | 'breath_478') => {
    if (k === 'breath_478') return '4-7-8 Breathing';
    return INTERVENTIONS[k]?.title ?? String(k);
  };

  const recentSessions = useMemo(() => {
    if (!events?.length) return [];
    return [...events]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);
  }, [events]);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={reclaimStandardScreenScroll}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => qc.invalidateQueries({ queryKey: ['mindfulness'] })}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View ref={scrollContentRef} collapsable={false}>
      {showMindfulnessFirstVisitGuide ? (
        <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
          <Card.Content>
            <FirstVisitCoach
              visible
              message="Tap the orb for a 2-minute reset — that's the whole commitment."
              showMeLabel="Show me"
              onShowMe={handleMindfulnessCoachShowMe}
              onDismiss={() => void handleDismissMindfulnessFirstVisitGuide()}
              style={utilitySurface}
            />
          </Card.Content>
        </Card>
      ) : null}
      {/* HERO — Breath orb replaces static header card */}
      <View ref={breathOrbRef} collapsable={false}>
      <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
        <Card.Content>
          <BreathOrb
            streak={streak}
            latestText={latestText}
            disabled={!!activeExercise}
            onPress={() => {
              if (activeExercise) return;
              startNow('breath_478');
            }}
          />
        </Card.Content>
      </Card>
      </View>

      {/* IN PROGRESS */}
      <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
        <Card.Content>
          <CardHeader
            title={activeExercise ? 'In progress' : 'Ready when you are'}
            subtitle={activeExercise ? 'Finish this to keep your streak alive' : 'Pick an exercise below — even 2 minutes counts'}
            icon="timer-sand"
          />
          <View style={{ marginTop: 12 }}>
            {activeExercise ? (
              renderActiveExerciseContent()
            ) : (
              <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.colors.surfaceVariant }}>
                <Text style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 6 }}>Suggestion</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Try 4-7-8 breathing. It’s simple, fast, and good when you feel wired or restless.
                </Text>
                <TouchableOpacity
                  onPress={() => startNow('breath_478')}
                  style={{
                    marginTop: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    alignSelf: 'flex-start',
                    backgroundColor: theme.colors.primary,
                  }}
                >
                  <Text style={{ color: theme.colors.onPrimary, fontWeight: '800' }}>Start 4-7-8</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* MINDFULNESS NOW — 2-column tool tiles */}
      <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
        <Card.Content>
          <CardHeader title="Mindfulness Now" subtitle="Pick a tool — even 2 minutes counts" icon="meditation" />

          <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
            {QUICK_CHOICES.map((k) => (
              <MindfulnessToolTile
                key={k}
                toolKey={k}
                title={renderQuickChoiceTitle(k)}
                selected={activeExercise === k}
                onPress={() => startNow(k)}
              />
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* HEALTH-BASED TRIGGERS */}
      <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
        <Card.Content>
          <CardHeader
            title="Heart-rate nudge"
            subtitle="Optional Health Connect heart-rate path: a breathing prompt when HR stays high while you look inactive"
            icon="heart-pulse"
            right={
              <Switch
                value={reactiveOn}
                onValueChange={(v) => {
                  reactiveLocalTouchedRef.current = true;
                  setReactiveOn(v);
                  void saveReactiveTriggersEnabled(v);
                }}
              />
            }
          />

          {reactiveOn ? (
            <Text style={{ fontSize: 12, marginTop: 10, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
              Uses Health Connect heart rate plus steps only as an inactivity gate (so we do not nudge while you are
              clearly walking). While Reclaim is open (and periodically in the background), elevated HR at rest can
              trigger one gentle breathing prompt. At most one per 2 hours, never at night. Not a clinical heart monitor.
            </Text>
          ) : (
            <Text style={{ fontSize: 12, marginTop: 10, color: theme.colors.onSurfaceVariant }}>
              Off • You can still use “Mindfulness Now” anytime
            </Text>
          )}

          {__DEV__ && reactiveOn && Platform.OS === 'android' ? (
            <Button
              mode="outlined"
              style={{ marginTop: 12, alignSelf: 'flex-start' }}
              onPress={async () => {
                const result = await devTestHrNudgeSynthetic(120);
                Alert.alert(
                  result.fired ? 'Test nudge sent' : 'Gate blocked nudge',
                  result.fired ? 'Check your notification shade.' : `Reason: ${result.reason ?? 'unknown'}`,
                );
              }}
            >
              Test nudge
            </Button>
          ) : null}
        </Card.Content>
      </Card>

      {/* AUTO-START MEDITATION */}
      <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
        <Card.Content>
          <CardHeader title="Auto-Start Meditation" subtitle="Alarm-style at a set time or after wake — tap to open and start (sound on)" icon="clock-start" />
          <View style={{ marginTop: 12 }}>
            <AutoStartMeditationContent />
          </View>
        </Card.Content>
      </Card>

      {/* RECENT SESSIONS */}
      <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
        <Card.Content>
          <CardHeader title="Recent sessions" subtitle="Your latest mindfulness activity" icon="history" />

          <View style={{ marginTop: 12 }}>
            {recentSessions.length ? (
              recentSessions.map((item) => (
                <View
                  key={item.id}
                  style={{
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.outlineVariant,
                  }}
                >
                  <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, opacity: 0.85 }}>
                    {(() => {
                      const d = new Date(item.created_at);
                      return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    })()}
                  </Text>

                  <Text style={{ fontSize: 15, marginTop: 4, color: theme.colors.onSurface, fontWeight: '700' }}>
                    {formatInterventionLabel(item.intervention)}
                  </Text>

                  <Text style={{ fontSize: 12, marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                    {item.trigger_type === 'manual' ? 'Started manually' :
                     item.trigger_type === 'rule' ? 'Triggered by a rule' :
                     item.trigger_type === 'reminder' ? 'From a reminder' :
                     'Started manually'}
                  </Text>
                </View>
              ))
            ) : (
              <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.colors.surfaceVariant }}>
                <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>No sessions yet.</Text>
              </View>
            )}

            <TouchableOpacity onPress={() => navigateToMood()} style={{ alignSelf: 'center', padding: 10, marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>Jump to Mood</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
      </View>
    </ScrollView>
  );
}
