// Training Setup Wizard - Collect user preferences for training
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, Text, useTheme, Chip, TextInput } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { OutcomePreviewPanel } from '@/components/training/OutcomePreviewPanel';
import { upsertTrainingProfile, getTrainingProfile, createProgramInstance, createProgramDays, logTrainingEvent, getActiveProgramInstance } from '@/lib/api';
import { logger } from '@/lib/logger';
import { buildFourWeekPlan, generateProgramDays } from '@/lib/training/programPlanner';
import type { TrainingGoal } from '@/lib/training/types';
import { mapBaselineKeyToExerciseId, normalizeEquipmentIds, mapExerciseIdToBaselineKey, denormalizeEquipmentId } from '@/lib/training/setupMappings';
import { estimate1RM } from '@/lib/training/progression';
import { formatLocalDateYYYYMMDD } from '@/lib/training/dateUtils';

type SetupStep = 'goals' | 'schedule' | 'equipment' | 'constraints' | 'baselines' | 'complete';

const GOALS: TrainingGoal[] = ['build_muscle', 'build_strength', 'lose_fat', 'get_fitter'];
const GOAL_LABELS: Record<TrainingGoal, string> = {
  build_muscle: 'Build Muscle',
  build_strength: 'Build Strength',
  lose_fat: 'Lose Fat',
  get_fitter: 'Get Fitter',
};

const EQUIPMENT_OPTIONS = [
  { id: 'barbell', label: 'Barbell' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'cable_machine', label: 'Cable Machine' },
  { id: 'cardio', label: 'Cardio Equipment' },
  { id: 'pull_up_bar', label: 'Pull-up Bar' },
  { id: 'bench', label: 'Bench' },
  { id: 'kettlebells', label: 'Kettlebells' },
];

const CONSTRAINT_OPTIONS = [
  { id: 'no_overhead', label: 'No Overhead Pressing' },
  { id: 'knee_pain', label: 'Knee Pain' },
  { id: 'back_sensitive', label: 'Back Sensitive' },
  { id: 'shoulder_issues', label: 'Shoulder Issues' },
  { id: 'wrist_issues', label: 'Wrist Issues' },
];

const BASELINE_EXERCISES = [
  { id: 'bench_press', label: 'Bench Press', placeholder: 'e.g., 60kg' },
  { id: 'squat', label: 'Squat', placeholder: 'e.g., 100kg' },
  { id: 'deadlift', label: 'Deadlift', placeholder: 'e.g., 120kg' },
  { id: 'overhead_press', label: 'Overhead Press', placeholder: 'e.g., 40kg' },
  { id: 'row', label: 'Barbell Row', placeholder: 'e.g., 70kg' },
];

interface TrainingSetupScreenProps {
  onComplete?: () => void;
}

// UI weekdays are 1..7 (Mon..Sun). JS Date.getDay() is 0..6 (Sun..Sat).
function uiWeekdayToJs(ui: number): number {
  return ui === 7 ? 0 : ui;
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Custom progress bar (no react-native-paper dependency)
 * - avoids export/version/type lint issues entirely
 */
function ProgressLine({
  progress,
  height = 10,
  backgroundColor,
  fillColor,
  radius = 999,
}: {
  progress: number;
  height?: number;
  backgroundColor: string;
  fillColor: string;
  radius?: number;
}) {
  const p = clamp01(progress);

  return (
    <View
      style={{
        height,
        width: '100%',
        backgroundColor,
        borderRadius: radius,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${Math.round(p * 100)}%`,
          backgroundColor: fillColor,
          borderRadius: radius,
        }}
      />
    </View>
  );
}

export default function TrainingSetupScreen({ onComplete }: TrainingSetupScreenProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const qc = useQueryClient();

  const [step, setStep] = useState<SetupStep>('goals');

  const [goals, setGoals] = useState<Record<TrainingGoal, number>>({
    build_muscle: 0.4,
    build_strength: 0.4,
    lose_fat: 0.1,
    get_fitter: 0.1,
  });

  // UI values: Mon=1 .. Sun=7
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri

  const [muscleFrequency, setMuscleFrequency] = useState<'once' | 'twice' | 'auto'>('auto');

  const [timePreference, setTimePreference] = useState<'morning' | 'evening' | 'flexible'>('flexible');
  const [timeStart, setTimeStart] = useState(6);
  const [timeEnd, setTimeEnd] = useState(10);

  const [equipment, setEquipment] = useState<string[]>(['barbell', 'dumbbells', 'bench']);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [baselines, setBaselines] = useState<Record<string, number>>({});
  // Store reps per baseline exercise (default 5)
  const [baselineReps, setBaselineReps] = useState<Record<string, number>>({});

  // Load existing profile and active program for prefill
  const profileQ = useQuery({
    queryKey: ['training:profile'],
    queryFn: () => getTrainingProfile(),
    retry: false,
    staleTime: 30000,
  });

  const activeProgramQ = useQuery({
    queryKey: ['training:activeProgram'],
    queryFn: () => getActiveProgramInstance(),
    retry: false,
    staleTime: 30000,
  });

  // Hydrate UI state from saved profile (prefill)
  useEffect(() => {
    if (!profileQ.data) return; // No profile yet, use defaults

    const profile = profileQ.data;

    // 1. Goals: use saved goals (already normalized)
    if (profile.goals && Object.keys(profile.goals).length > 0) {
      const hydratedGoals: Record<TrainingGoal, number> = {
        build_muscle: profile.goals.build_muscle || 0,
        build_strength: profile.goals.build_strength || 0,
        lose_fat: profile.goals.lose_fat || 0,
        get_fitter: profile.goals.get_fitter || 0,
      };
      // Ensure total is reasonable (if all zeros, keep defaults)
      const total = Object.values(hydratedGoals).reduce((sum, v) => sum + v, 0);
      if (total > 0) {
        setGoals(hydratedGoals);
      }
    }

    // 2. Schedule: weekdays from active program or profile
    if (activeProgramQ.data?.selected_weekdays && Array.isArray(activeProgramQ.data.selected_weekdays)) {
      setSelectedWeekdays(activeProgramQ.data.selected_weekdays);
    } else if (profile.days_per_week) {
      // Fallback: use default pattern based on days_per_week
      const defaults: Record<number, number[]> = {
        3: [1, 3, 5], // Mon, Wed, Fri
        4: [1, 2, 4, 6], // Mon, Tue, Thu, Sat
        5: [1, 2, 3, 4, 5], // Mon-Fri
      };
      setSelectedWeekdays(defaults[profile.days_per_week] || [1, 3, 5]);
    }

    // Muscle frequency preference from constraints.preferences
    if (profile.constraints?.preferences?.muscle_frequency_preference) {
      const freq = profile.constraints.preferences.muscle_frequency_preference;
      if (freq === 'once' || freq === 'twice' || freq === 'auto') {
        setMuscleFrequency(freq);
      }
    }

    // Time preference from preferred_time_window
    if (profile.preferred_time_window) {
      const tw = profile.preferred_time_window;
      if (tw.morning) {
        setTimePreference('morning');
        if (tw.startRange !== undefined) setTimeStart(tw.startRange);
        if (tw.endRange !== undefined) setTimeEnd(tw.endRange);
      } else if (tw.evening) {
        setTimePreference('evening');
        if (tw.startRange !== undefined) setTimeStart(tw.startRange);
        if (tw.endRange !== undefined) setTimeEnd(tw.endRange);
      }
    }

    // 3. Equipment: from equipment_access
    if (profile.equipment_access && Array.isArray(profile.equipment_access)) {
      const denormalized = profile.equipment_access.map((id) => denormalizeEquipmentId(String(id))).filter((id): id is string => id !== null);
      setEquipment(denormalized);
    }

    // 4. Constraints: map back from injuries + forbiddenMovements
    const hydratedConstraints: string[] = [];
    if (profile.constraints) {
      // Map injuries back to UI constraint IDs
      if (profile.constraints.injuries) {
        profile.constraints.injuries.forEach((injury) => {
          if (injury.includes('knee')) hydratedConstraints.push('knee_pain');
          if (injury.includes('back')) hydratedConstraints.push('back_sensitive');
          if (injury.includes('shoulder')) hydratedConstraints.push('shoulder_issues');
          if (injury.includes('wrist')) hydratedConstraints.push('wrist_issues');
        });
      }
      // Map forbiddenMovements back to UI constraint IDs
      if (profile.constraints.forbiddenMovements) {
        if (profile.constraints.forbiddenMovements.includes('vertical_press')) {
          hydratedConstraints.push('no_overhead');
        }
      }
    }
    setConstraints(Array.from(new Set(hydratedConstraints))); // Deduplicate

    // 5. Baselines: reverse-calculate weight from e1RM (assume 5 reps default)
    if (profile.baselines && Object.keys(profile.baselines).length > 0) {
      const hydratedBaselines: Record<string, number> = {};
      const hydratedReps: Record<string, number> = {};
      const defaultReps = 5;

      for (const [exerciseId, e1RM] of Object.entries(profile.baselines)) {
        const setupKey = mapExerciseIdToBaselineKey(exerciseId);
        if (setupKey && e1RM > 0) {
          // Reverse Epley: weight = e1RM / (1 + reps/30)
          const weight = e1RM / (1 + defaultReps / 30);
          hydratedBaselines[setupKey] = Math.round(weight * 10) / 10; // Round to 1 decimal
          hydratedReps[setupKey] = defaultReps;
        }
      }
      setBaselines(hydratedBaselines);
      setBaselineReps(hydratedReps);
    }
  }, [profileQ.data, activeProgramQ.data]);

  // Convert UI weekdays to JS weekdays (0..6) for planners
  const selectedWeekdaysJs = useMemo(() => {
    return selectedWeekdays.map(uiWeekdayToJs).sort((a, b) => a - b);
  }, [selectedWeekdays]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      // Normalize goals to sum to 1.0
      const total = Object.values(goals).reduce((sum, v) => sum + v, 0);
      const normalizedGoals: Record<string, number> = {};
      for (const [key, value] of Object.entries(goals)) {
        normalizedGoals[key] = total > 0 ? value / total : 0;
      }

      const timeWindow: any = {};
      if (timePreference === 'morning') {
        timeWindow.morning = true;
        timeWindow.startRange = timeStart;
        timeWindow.endRange = timeEnd;
      } else if (timePreference === 'evening') {
        timeWindow.evening = true;
        timeWindow.startRange = timeStart;
        timeWindow.endRange = timeEnd;
      }

      const forbiddenMovements: string[] = [];
      if (constraints.includes('no_overhead')) forbiddenMovements.push('vertical_press');

      // Validate muscle frequency preference feasibility
      let effectiveMuscleFrequency = muscleFrequency;
      let frequencyWarning: string | null = null;
      
      if (muscleFrequency === 'once' && selectedWeekdays.length < 3) {
        // Can't hit each muscle group once per week with less than 3 days
        effectiveMuscleFrequency = 'auto';
        frequencyWarning = 'Once-per-week frequency requires at least 3 training days. Using auto instead.';
      } else if (muscleFrequency === 'twice' && selectedWeekdays.length < 2) {
        // Can't hit each muscle group twice per week with less than 2 days
        effectiveMuscleFrequency = 'auto';
        frequencyWarning = 'Twice-per-week frequency requires at least 2 training days. Using auto instead.';
      }

      if (frequencyWarning) {
        logger.warn('[TrainingSetup] Muscle frequency preference adjusted', { 
          requested: muscleFrequency, 
          effective: effectiveMuscleFrequency,
          daysPerWeek: selectedWeekdays.length 
        });
      }

      // Convert baseline weights to e1RM and map to real exercise IDs
      const baselineE1RMs: Record<string, number> = {};
      for (const [setupKey, weight] of Object.entries(baselines)) {
        if (weight && weight > 0) {
          const reps = baselineReps[setupKey] || 5; // Default to 5 reps if not specified
          const e1RM = estimate1RM(weight, reps);
          // Map setup key to exercise ID
          const exerciseId = mapBaselineKeyToExerciseId(setupKey);
          if (exerciseId) {
            baselineE1RMs[exerciseId] = e1RM;
          }
        }
      }

      // Normalize equipment IDs
      const normalizedEquipment = normalizeEquipmentIds(equipment);

      // 1) Save/Upsert profile
      const profile = await upsertTrainingProfile({
        goals: normalizedGoals,
        days_per_week: selectedWeekdays.length,
        preferred_time_window: timeWindow,
        equipment_access: normalizedEquipment,
        constraints: {
          injuries: constraints.filter((c) => c.includes('pain') || c.includes('issues')),
          forbiddenMovements,
          preferences: {
            muscle_frequency_preference: effectiveMuscleFrequency,
          },
        },
        baselines: baselineE1RMs,
      });

      // 2) Create a 4-week program instance
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      const plan = buildFourWeekPlan(
        {
          goals: normalizedGoals,
          equipment_access: normalizedEquipment,
          constraints: {
            injuries: constraints,
            forbiddenMovements,
          },
          baselines: baselineE1RMs,
          days_per_week: selectedWeekdays.length,
          muscle_frequency_preference: effectiveMuscleFrequency,
        } as any,
        // IMPORTANT: pass JS weekdays (0..6) to planner
        selectedWeekdaysJs,
        startDate,
      );

      const programInstance = await createProgramInstance({
        // CRITICAL: Use local date formatting to prevent weekday drift in timezones ahead of UTC
        // See dateUtils.ts for rationale
        start_date: formatLocalDateYYYYMMDD(startDate),
        duration_weeks: 4,
        // store UI weekdays in DB (fine)
        selected_weekdays: selectedWeekdays,
        plan,
        profile_snapshot: {
          goals: normalizedGoals,
          equipment_access: normalizedEquipment,
          constraints: {
            injuries: constraints,
            forbiddenMovements,
          },
          baselines: baselineE1RMs,
          selected_weekdays_js: selectedWeekdaysJs,
        },
        status: 'active',
      });

      // 3) Generate and insert program days
      const programDays = generateProgramDays(programInstance.id, programInstance.user_id, plan, startDate);

      if (!Array.isArray(programDays) || programDays.length === 0) {
        await logTrainingEvent('training_program_days_generated_empty', {
          programId: programInstance.id,
          selectedWeekdaysUI: selectedWeekdays,
          selectedWeekdaysJS: selectedWeekdaysJs,
          startDate: formatLocalDateYYYYMMDD(startDate),
        }).catch(() => {});
        throw new Error('Program days generation returned 0 days. (Weekday mapping mismatch)');
      }

      // Log before insert for debugging
      console.log('[TrainingSetup] Inserting program days:', {
        programId: programInstance.id,
        userId: programInstance.user_id,
        generatedCount: programDays.length,
        sampleDay: programDays[0],
      });

      const inserted = await createProgramDays(programDays);

      if (!Array.isArray(inserted) || inserted.length === 0) {
        await logTrainingEvent('training_program_days_inserted_empty', {
          programId: programInstance.id,
          generatedCount: programDays.length,
        }).catch(() => {});
        throw new Error('Program days insert returned 0 rows. Check Supabase RLS or insert payload.');
      }

      // Runtime verification: query actual count from DB
      const expectedDays = 4 * selectedWeekdaysJs.length; // 4 weeks * days per week
      const actualCount = inserted.length;

      console.log('[TrainingSetup] Program days verification:', {
        programId: programInstance.id,
        instanceId: programInstance.id,
        expectedDays,
        actualCount,
        match: actualCount === expectedDays,
      });

      if (actualCount !== expectedDays) {
        const errorMsg = `Program days count mismatch! program_id=${programInstance.id}, instance_id=${programInstance.id}, expected=${expectedDays}, actual=${actualCount}`;
        console.error('[TrainingSetup] VERIFICATION FAILED:', errorMsg);
        await logTrainingEvent('training_program_days_count_mismatch', {
          programId: programInstance.id,
          expectedDays,
          actualCount,
        }).catch(() => {});
        throw new Error(errorMsg);
      }

      await logTrainingEvent('training_setup_saved_program', {
        programId: programInstance.id,
        programDaysInserted: inserted.length,
        selectedWeekdaysUI: selectedWeekdays,
        selectedWeekdaysJS: selectedWeekdaysJs,
      }).catch(() => {});

      return profile;
    },

    onSuccess: async () => {
      try {
        const { generateWeeklyTrainingPlan } = await import('@/lib/training/scheduler');
        const profile = await getTrainingProfile();
        if (profile) {
          await generateWeeklyTrainingPlan(profile);
        }
        await logTrainingEvent('training_setup_completed', {
          daysPerWeek: profile?.days_per_week,
          goals: Object.keys(profile?.goals || {}),
        }).catch(() => {});
      } catch (error) {
        logger.warn('Failed to generate weekly plan', error);
      }

      try {
        const keys = [
          ['training:profile'],
          ['training:activeProgram'],
          ['training:programDays:week'],
          ['training:programDays:fourWeek'],
          ['training:sessions'],
        ];
        logger.debug('[TRAIN_SETUP_CACHE] invalidate', keys.map((k) => k[0]));
        await Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
        await Promise.all([
          qc.refetchQueries({ queryKey: ['training:profile'] }),
          qc.refetchQueries({ queryKey: ['training:activeProgram'] }),
        ]);
      } catch (error) {
        logger.warn('[TRAIN_SETUP_CACHE] invalidate failed', error);
      }

      onComplete?.();
    },

    onError: (error: any) => {
      logger.warn('Failed to save training profile/setup', error);
      Alert.alert('Error', error?.message || 'Failed to save profile/setup');
    },
  });

  const updateGoal = useCallback((goal: TrainingGoal, value: number) => {
    setGoals((prev) => {
      const updated = { ...prev, [goal]: Math.max(0, Math.min(1, value)) };
      const total = Object.values(updated).reduce((sum, v) => sum + v, 0);
      if (total > 1) {
        for (const key in updated) {
          updated[key as TrainingGoal] = updated[key as TrainingGoal] / total;
        }
      }
      return updated;
    });
  }, []);

  const toggleEquipment = useCallback((id: string) => {
    setEquipment((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }, []);

  const toggleConstraint = useCallback((id: string) => {
    setConstraints((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }, []);

  const updateBaseline = useCallback((exerciseId: string, value: string) => {
    const num = parseFloat(value);
    setBaselines((prev) => ({
      ...prev,
      [exerciseId]: isNaN(num) ? 0 : num,
    }));
  }, []);

  const updateBaselineReps = useCallback((exerciseId: string, reps: number) => {
    setBaselineReps((prev) => ({
      ...prev,
      [exerciseId]: reps,
    }));
  }, []);

  const nextStep = useCallback(() => {
    if (step === 'goals') setStep('schedule');
    else if (step === 'schedule') setStep('equipment');
    else if (step === 'equipment') setStep('constraints');
    else if (step === 'constraints') setStep('baselines');
    else if (step === 'baselines') saveProfileMutation.mutate();
  }, [step, saveProfileMutation]);

  const prevStep = useCallback(() => {
    if (step === 'schedule') setStep('goals');
    else if (step === 'equipment') setStep('schedule');
    else if (step === 'constraints') setStep('equipment');
    else if (step === 'baselines') setStep('constraints');
  }, [step]);

  const stepProgress =
    {
      goals: 0.2,
      schedule: 0.4,
      equipment: 0.6,
      constraints: 0.8,
      baselines: 0.9,
      complete: 1.0,
    }[step] ?? 0.2;

  const TimePrefButton = ({ value, label }: { value: 'morning' | 'evening' | 'flexible'; label: string }) => (
    <Button
      mode={timePreference === value ? 'contained' : 'outlined'}
      onPress={() => setTimePreference(value)}
      style={{ flex: 1 }}
    >
      {label}
    </Button>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: appTheme.spacing.lg, paddingTop: appTheme.spacing.lg }}>
        {/* Custom progress bar (paper-free) */}
        <ProgressLine
          progress={stepProgress}
          backgroundColor={theme.colors.surfaceVariant}
          fillColor={theme.colors.primary}
          height={10}
        />

        <Text
          variant="titleMedium"
          numberOfLines={2}
          style={{
            marginTop: appTheme.spacing.lg,
            marginBottom: appTheme.spacing.sm,
            fontWeight: '700',
            color: theme.colors.onSurface,
          }}
        >
          {step === 'goals' && 'Training Goals'}
          {step === 'schedule' && 'Schedule Preferences'}
          {step === 'equipment' && 'Available Equipment'}
          {step === 'constraints' && 'Constraints & Injuries'}
          {step === 'baselines' && 'Strength Baselines (Optional)'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: appTheme.spacing.lg, paddingTop: appTheme.spacing.lg, paddingBottom: 140 }}>
        {step === 'goals' && (
          <View>
            <Text style={{ marginBottom: appTheme.spacing.sm, color: theme.colors.onSurfaceVariant }} numberOfLines={3}>
              Select 2-3 goals and adjust their importance. Weights will auto-normalize to sum to 1.0.
            </Text>

            <Text variant="bodySmall" style={{ marginBottom: appTheme.spacing.lg, color: theme.colors.primary, fontWeight: '600' }}>
              Total: {Math.round(Object.values(goals).reduce((sum, v) => sum + v, 0) * 100)}%
            </Text>

            {GOALS.map((goal) => (
              <View key={goal} style={{ marginBottom: appTheme.spacing.lg }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    {GOAL_LABELS[goal]}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
                    {Math.round(goals[goal] * 100)}%
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ marginRight: appTheme.spacing.sm, minWidth: 40, color: theme.colors.onSurfaceVariant }}>0%</Text>
                  <View style={{ flex: 1 }}>
                    <ProgressLine
                      progress={goals[goal]}
                      backgroundColor={theme.colors.surfaceVariant}
                      fillColor={theme.colors.primary}
                      height={10}
                    />
                  </View>
                  <Text style={{ marginLeft: appTheme.spacing.sm, minWidth: 40, color: theme.colors.onSurfaceVariant }}>100%</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: appTheme.spacing.sm }}>
                  <Button mode="outlined" compact onPress={() => updateGoal(goal, goals[goal] - 0.1)} disabled={goals[goal] <= 0}>
                    -
                  </Button>
                  <Button mode="outlined" compact onPress={() => updateGoal(goal, goals[goal] + 0.1)} disabled={goals[goal] >= 1}>
                    +
                  </Button>
                </View>
              </View>
            ))}

            {/* Outcome Preview Panel */}
            <OutcomePreviewPanel
              goals={goals}
              selectedWeekdays={selectedWeekdays}
              equipment={equipment}
              constraints={constraints}
              baselines={baselines}
              muscleFrequency={muscleFrequency}
            />
          </View>
        )}

        {step === 'schedule' && (
          <View>
            <Text style={{ marginBottom: appTheme.spacing.lg, color: theme.colors.onSurfaceVariant }}>
              Which days of the week do you want to train?
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm, marginBottom: appTheme.spacing.xxl, alignItems: 'flex-start' }}>
              {[
                { value: 1, label: 'Mon' },
                { value: 2, label: 'Tue' },
                { value: 3, label: 'Wed' },
                { value: 4, label: 'Thu' },
                { value: 5, label: 'Fri' },
                { value: 6, label: 'Sat' },
                { value: 7, label: 'Sun' },
              ].map((day) => (
                <Chip
                  key={day.value}
                  selected={selectedWeekdays.includes(day.value)}
                  onPress={() => {
                    setSelectedWeekdays((prev) =>
                      prev.includes(day.value)
                        ? prev.filter((d) => d !== day.value)
                        : [...prev, day.value].sort((a, b) => a - b),
                    );
                  }}
                  style={{ minWidth: 60, marginBottom: 0 }}
                >
                  {day.label}
                </Chip>
              ))}
            </View>

            <Text variant="bodySmall" style={{ marginBottom: appTheme.spacing.lg, color: theme.colors.primary }}>
              Selected: {selectedWeekdays.length} days/week
            </Text>

            <Text style={{ marginBottom: appTheme.spacing.sm, color: theme.colors.onSurfaceVariant }}>
              How often per week do you want to hit each muscle group?
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm, marginBottom: appTheme.spacing.lg }}>
              <Chip
                selected={muscleFrequency === 'once'}
                onPress={() => setMuscleFrequency('once')}
                style={{ minWidth: 100 }}
              >
                Once per week
              </Chip>
              <Chip
                selected={muscleFrequency === 'twice'}
                onPress={() => setMuscleFrequency('twice')}
                style={{ minWidth: 100 }}
              >
                Twice per week
              </Chip>
              <Chip
                selected={muscleFrequency === 'auto'}
                onPress={() => setMuscleFrequency('auto')}
                style={{ minWidth: 100 }}
              >
                Auto (recommended)
              </Chip>
            </View>

            {muscleFrequency === 'once' && selectedWeekdays.length < 3 && (
              <Text variant="bodySmall" style={{ marginBottom: appTheme.spacing.md, color: theme.colors.error }}>
                Note: Once-per-week frequency requires at least 3 training days. Consider adding more days or selecting "Auto".
              </Text>
            )}

            {muscleFrequency === 'twice' && selectedWeekdays.length < 2 && (
              <Text variant="bodySmall" style={{ marginBottom: appTheme.spacing.md, color: theme.colors.error }}>
                Note: Twice-per-week frequency requires at least 2 training days. Consider adding more days or selecting "Auto".
              </Text>
            )}

            <Text style={{ marginBottom: appTheme.spacing.sm, color: theme.colors.onSurfaceVariant }}>Preferred training time?</Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TimePrefButton value="morning" label="Morning" />
              <TimePrefButton value="evening" label="Evening" />
              <TimePrefButton value="flexible" label="Flexible" />
            </View>
          </View>
        )}

        {step === 'equipment' && (
          <View>
            <Text style={{ marginBottom: appTheme.spacing.lg, color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
              Select all equipment you have access to:
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm, alignItems: 'flex-start' }}>
              {EQUIPMENT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.id}
                  selected={equipment.includes(opt.id)}
                  onPress={() => toggleEquipment(opt.id)}
                  style={{ marginBottom: 0 }}
                >
                  {opt.label}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {step === 'constraints' && (
          <View>
            <Text style={{ marginBottom: appTheme.spacing.lg, color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
              Select any constraints or injuries that apply:
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm, alignItems: 'flex-start' }}>
              {CONSTRAINT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.id}
                  selected={constraints.includes(opt.id)}
                  onPress={() => toggleConstraint(opt.id)}
                  style={{ marginBottom: 0 }}
                >
                  {opt.label}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {step === 'baselines' && (
          <View>
            <Text style={{ marginBottom: appTheme.spacing.lg, color: theme.colors.onSurfaceVariant }}>
              Optional: Enter your typical working weight for these exercises. This helps us suggest better starting weights.
            </Text>

            <Button
              mode="text"
              onPress={() => {
                setBaselines({});
                saveProfileMutation.mutate();
              }}
              style={{ marginBottom: appTheme.spacing.lg }}
            >
              Skip baselines
            </Button>

            {BASELINE_EXERCISES.map((ex) => (
              <View key={ex.id} style={{ marginBottom: appTheme.spacing.lg }}>
                <Text variant="bodyMedium" style={{ marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
                  {ex.label}
                </Text>
                <View style={{ flexDirection: 'row', gap: appTheme.spacing.sm, marginBottom: appTheme.spacing.sm }}>
                  <TextInput
                    mode="outlined"
                    placeholder={ex.placeholder}
                    value={baselines[ex.id] ? baselines[ex.id].toString() : ''}
                    onChangeText={(text: string) => updateBaseline(ex.id, text)}
                    keyboardType="numeric"
                    style={{ flex: 1 }}
                  />
                  <View style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                      Reps
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[3, 5, 8].map((reps) => (
                        <Chip
                          key={reps}
                          selected={(baselineReps[ex.id] || 5) === reps}
                          onPress={() => updateBaselineReps(ex.id, reps)}
                          style={{ minWidth: 50 }}
                        >
                          {reps}
                        </Chip>
                      ))}
                    </View>
                  </View>
                </View>
                {baselines[ex.id] && baselines[ex.id] > 0 && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    Est. 1RM: {Math.round(estimate1RM(baselines[ex.id], baselineReps[ex.id] || 5))}kg
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: appTheme.spacing.xxl }}>
          <View style={{ flexDirection: 'row', gap: appTheme.spacing.sm }}>
            <Button mode="outlined" onPress={prevStep} disabled={step === 'goals'}>
              Back
            </Button>
            {/* Exit button only shown in edit mode (when profile exists) */}
            {profileQ.data && (
              <Button
                mode="text"
                onPress={() => {
                  // Exit without saving - just close the setup screen
                  onComplete?.();
                }}
                textColor={theme.colors.error}
              >
                Exit
              </Button>
            )}
          </View>
          <Button
            mode="contained"
            onPress={nextStep}
            loading={saveProfileMutation.isPending}
            disabled={saveProfileMutation.isPending}
          >
            {step === 'baselines' ? 'Save' : 'Next'}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
