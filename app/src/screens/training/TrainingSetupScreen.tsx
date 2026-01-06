// Training Setup Wizard - Collect user preferences for training
import React, { useState, useCallback } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, Text, useTheme, ProgressBar, Chip, TextInput, Switch, SegmentedButtons } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { InformationalCard, ActionCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { upsertTrainingProfile, getTrainingProfile, createProgramInstance, createProgramDays } from '@/lib/api';
import { logger } from '@/lib/logger';
import { buildFourWeekPlan, generateProgramDays } from '@/lib/training/programPlanner';
import type { TrainingGoal } from '@/lib/training/types';

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
  { id: 'cables', label: 'Cable Machine' },
  { id: 'machines', label: 'Machines' },
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

export default function TrainingSetupScreen({ onComplete }: TrainingSetupScreenProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [step, setStep] = useState<SetupStep>('goals');
  const [goals, setGoals] = useState<Record<TrainingGoal, number>>({
    build_muscle: 0.4,
    build_strength: 0.4,
    lose_fat: 0.1,
    get_fitter: 0.1,
  });
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [timePreference, setTimePreference] = useState<'morning' | 'evening' | 'flexible'>('flexible');
  const [timeStart, setTimeStart] = useState(6);
  const [timeEnd, setTimeEnd] = useState(10);
  const [equipment, setEquipment] = useState<string[]>(['barbell', 'dumbbells', 'bench']);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [baselines, setBaselines] = useState<Record<string, number>>({});

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

      const profile = await upsertTrainingProfile({
        goals: normalizedGoals,
        days_per_week: selectedWeekdays.length,
        preferred_time_window: timeWindow,
        equipment_access: equipment,
        constraints: {
          injuries: constraints.filter((c) => c.includes('pain') || c.includes('issues')),
          forbiddenMovements,
          preferences: {},
        },
        baselines: Object.fromEntries(
          Object.entries(baselines).filter(([, v]) => v && v > 0),
        ),
      });

      // Create 4-week program instance
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      const plan = buildFourWeekPlan(
        {
          goals: normalizedGoals,
          equipment_access: equipment,
          constraints: {
            injuries: constraints,
            forbiddenMovements,
          },
          baselines,
          days_per_week: selectedWeekdays.length,
        } as any,
        selectedWeekdays,
        startDate,
      );

      const programInstance = await createProgramInstance({
        start_date: startDate.toISOString().split('T')[0],
        duration_weeks: 4,
        selected_weekdays: selectedWeekdays,
        plan,
        profile_snapshot: {
          goals: normalizedGoals,
          equipment_access: equipment,
          constraints: {
            injuries: constraints,
            forbiddenMovements,
          },
          baselines,
        },
        status: 'active',
      });

      // Generate program days for 4 weeks
      const programDays = generateProgramDays(
        programInstance.id,
        programInstance.user_id,
        plan,
        startDate,
      );

      await createProgramDays(programDays);

      return profile;
    },
    onSuccess: async () => {
      // Generate weekly plan after profile is saved
      try {
        const { generateWeeklyTrainingPlan } = await import('@/lib/training/scheduler');
        const { logTrainingEvent } = await import('@/lib/api');
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
        // Don't block completion if this fails
      }
      setStep('complete');
    },
    onError: (error: any) => {
      logger.warn('Failed to save training profile', error);
      Alert.alert('Error', error?.message || 'Failed to save profile');
    },
  });

  const updateGoal = useCallback((goal: TrainingGoal, value: number) => {
    setGoals((prev) => {
      const updated = { ...prev, [goal]: Math.max(0, Math.min(1, value)) };
      // Auto-normalize if sum > 1
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

  const stepProgress = {
    goals: 0.2,
    schedule: 0.4,
    equipment: 0.6,
    constraints: 0.8,
    baselines: 0.9,
    complete: 1.0,
  }[step];

  if (step === 'complete') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}
        >
          <InformationalCard>
            <FeatureCardHeader icon="check-circle" title="Setup complete!" />
            <Text style={{ marginTop: 8, marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
              Your training profile has been saved. You can now generate personalized workout sessions.
            </Text>
            <Button
              mode="contained"
              onPress={() => {
                if (onComplete) {
                  onComplete();
                }
              }}
            >
              Start training
            </Button>
          </InformationalCard>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: appTheme.spacing.lg, paddingTop: appTheme.spacing.lg }}>
        <ProgressBar progress={stepProgress} color={theme.colors.primary} />
        <Text
          variant="titleMedium"
          style={{ marginTop: appTheme.spacing.lg, marginBottom: appTheme.spacing.sm, fontWeight: '700', color: theme.colors.onSurface }}
        >
          {step === 'goals' && 'Training Goals'}
          {step === 'schedule' && 'Schedule Preferences'}
          {step === 'equipment' && 'Available Equipment'}
          {step === 'constraints' && 'Constraints & Injuries'}
          {step === 'baselines' && 'Strength Baselines (Optional)'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: appTheme.spacing.lg, paddingTop: appTheme.spacing.lg, paddingBottom: 140 }}
      >
        {step === 'goals' && (
          <View>
            <Text style={{ marginBottom: appTheme.spacing.sm, color: theme.colors.onSurfaceVariant }}>
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
                    <ProgressBar progress={goals[goal]} color={theme.colors.primary} />
                  </View>
                  <Text style={{ marginLeft: appTheme.spacing.sm, minWidth: 40, color: theme.colors.onSurfaceVariant }}>100%</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: appTheme.spacing.sm }}>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => updateGoal(goal, goals[goal] - 0.1)}
                    disabled={goals[goal] <= 0}
                  >
                    -
                  </Button>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => updateGoal(goal, goals[goal] + 0.1)}
                    disabled={goals[goal] >= 1}
                  >
                    +
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}

        {step === 'schedule' && (
          <View>
            <Text style={{ marginBottom: appTheme.spacing.lg, color: theme.colors.onSurfaceVariant }}>
              Which days of the week do you want to train?
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm, marginBottom: appTheme.spacing.xxl }}>
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
                        : [...prev, day.value].sort((a, b) => a - b)
                    );
                  }}
                  style={{ minWidth: 60 }}
                >
                  {day.label}
                </Chip>
              ))}
            </View>
            <Text variant="bodySmall" style={{ marginBottom: appTheme.spacing.xxl, color: theme.colors.primary }}>
              Selected: {selectedWeekdays.length} days/week
            </Text>

            <Text style={{ marginBottom: appTheme.spacing.sm, color: theme.colors.onSurfaceVariant }}>
              Preferred training time?
            </Text>
            <SegmentedButtons
              value={timePreference}
              onValueChange={(v) => setTimePreference(v as any)}
              buttons={[
                { value: 'morning', label: 'Morning' },
                { value: 'evening', label: 'Evening' },
                { value: 'flexible', label: 'Flexible' },
              ]}
            />
          </View>
        )}

        {step === 'equipment' && (
          <View>
            <Text style={{ marginBottom: appTheme.spacing.lg, color: theme.colors.onSurfaceVariant }}>
              Select all equipment you have access to:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm }}>
              {EQUIPMENT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.id}
                  selected={equipment.includes(opt.id)}
                  onPress={() => toggleEquipment(opt.id)}
                  style={{ marginBottom: appTheme.spacing.sm }}
                >
                  {opt.label}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {step === 'constraints' && (
          <View>
            <Text style={{ marginBottom: appTheme.spacing.lg, color: theme.colors.onSurfaceVariant }}>
              Select any constraints or injuries that apply:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm }}>
              {CONSTRAINT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.id}
                  selected={constraints.includes(opt.id)}
                  onPress={() => toggleConstraint(opt.id)}
                  style={{ marginBottom: appTheme.spacing.sm }}
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
              Optional: Enter your typical working weight for these exercises. This helps us suggest better starting
              weights.
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
                <TextInput
                  mode="outlined"
                  placeholder={ex.placeholder}
                  value={baselines[ex.id] ? baselines[ex.id].toString() : ''}
                  onChangeText={(text) => updateBaseline(ex.id, text)}
                  keyboardType="numeric"
                />
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: appTheme.spacing.xxl }}>
          <Button mode="outlined" onPress={prevStep} disabled={step === 'goals'}>
            Back
          </Button>
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
