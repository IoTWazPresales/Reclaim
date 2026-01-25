// Training Screen - Main entry point for training module
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import {
  Button,
  Card,
  Text,
  useTheme,
  ActivityIndicator,
  IconButton,
  Chip,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InformationalCard, ActionCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { useAppTheme } from '@/theme';
import { buildSessionFromProgramDay } from '@/lib/training/engine';
import {
  createTrainingSession,
  createTrainingSessionItems,
  listTrainingSessions,
  getTrainingSession,
  getTrainingProfile,
  logTrainingEvent,
  getActiveProgramInstance,
  getProgramDays,
  updateTrainingSession,
} from '@/lib/api';
import { syncOfflineQueue } from '@/lib/training/offlineSync';
import TrainingSetupScreen from './training/TrainingSetupScreen';
import type { SessionPlan, SessionTemplate, MovementIntent } from '@/lib/training/types';
import { logger } from '@/lib/logger';
import TrainingSessionView from '@/components/training/TrainingSessionView';
import TrainingHistoryView from '@/components/training/TrainingHistoryView';
import SessionPreviewModal from '@/components/training/SessionPreviewModal';
import WeekView from '@/components/training/WeekView';
import FourWeekPreview from '@/components/training/FourWeekPreview';
import TrainingAnalyticsScreen from './training/TrainingAnalyticsScreen';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';


type Tab = 'today' | 'history';

function toYMD(d: Date) {
  return d.toISOString().split('T')[0];
}

function startOfWeekMonday(dateIn: Date) {
  const date = new Date(dateIn);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(dateIn: Date, days: number) {
  const d = new Date(dateIn);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isPast(date: Date, today: Date): boolean {
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dateDay < todayDay;
}

export default function TrainingScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const qc = useQueryClient();

  // Bucket 2: Entry chain marker - TrainingScreen mount
  useEffect(() => {
    logger.debug(`[ENTRY_CHAIN] TrainingScreen mounted`);
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // used to focus a session in History later (safe to keep even if not yet wired)
  const [historySelectedSessionId, setHistorySelectedSessionId] = useState<string | null>(null);

  const [showSetup, setShowSetup] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<SessionPlan | null>(null);
  const [selectedProgramDay, setSelectedProgramDay] = useState<any | null>(null);

  // Bucket 5: Post-setup reconcile state to prevent CTA flash
  const [setupJustCompletedAt, setSetupJustCompletedAt] = useState<number | null>(null);

  // This drives the week currently shown in WeekView
  const [currentWeekAnchor, setCurrentWeekAnchor] = useState<Date>(new Date());

  // Load profile
  const profileQ = useQuery({
    queryKey: ['training:profile'],
    queryFn: () => getTrainingProfile(),
    retry: false,
    staleTime: 60_000,
  });

  // Load active program
  const activeProgramQ = useQuery({
    queryKey: ['training:activeProgram'],
    queryFn: () => getActiveProgramInstance(),
    retry: false,
    staleTime: 300_000,
  });

  // Compute current week range (Mon..Sun)
  const weekStart = useMemo(() => startOfWeekMonday(currentWeekAnchor), [currentWeekAnchor]);
  const weekEnd = useMemo(() => {
    const d = addDays(weekStart, 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);

  // Compute 4-week range starting from the displayed week (Mon..Sun + 3 more weeks)
  const fourWeekStart = useMemo(() => weekStart, [weekStart]);
  const fourWeekEnd = useMemo(() => {
    const d = addDays(fourWeekStart, 27); // 4 weeks window (28 days)
    d.setHours(23, 59, 59, 999);
    return d;
  }, [fourWeekStart]);

  // Load program days for current week
  const programDaysWeekQ = useQuery({
    queryKey: ['training:programDays:week', activeProgramQ.data?.id, weekStart.toISOString()],
    queryFn: () => {
      if (!activeProgramQ.data) return [];
      return getProgramDays(activeProgramQ.data.id, toYMD(weekStart), toYMD(weekEnd));
    },
    enabled: !!activeProgramQ.data,
    staleTime: 300_000,
  });

  // Load program days for 4-week preview window
  const programDaysFourWeekQ = useQuery({
    queryKey: ['training:programDays:fourWeek', activeProgramQ.data?.id, fourWeekStart.toISOString()],
    queryFn: () => {
      if (!activeProgramQ.data) return [];
      return getProgramDays(activeProgramQ.data.id, toYMD(fourWeekStart), toYMD(fourWeekEnd));
    },
    enabled: !!activeProgramQ.data,
    staleTime: 300_000,
  });

  // Load sessions
  const sessionsQ = useQuery({
    queryKey: ['training:sessions'],
    queryFn: () => listTrainingSessions(50),
    retry: false,
    staleTime: 30_000,
  });

  // Fix: Detect stale cached program (program exists in cache but no days in DB)
  useEffect(() => {
    if (
      activeProgramQ.data &&
      !programDaysWeekQ.isLoading &&
      !programDaysFourWeekQ.isLoading &&
      (programDaysWeekQ.data?.length ?? 0) === 0 &&
      (programDaysFourWeekQ.data?.length ?? 0) === 0
    ) {
      console.warn('[TrainingScreen] Stale program detected (0 days), invalidating cache');
      qc.invalidateQueries({ queryKey: ['training:activeProgram'] });
      qc.invalidateQueries({ queryKey: ['training:profile'] });
    }
  }, [
    activeProgramQ.data,
    programDaysWeekQ.isLoading,
    programDaysWeekQ.data,
    programDaysFourWeekQ.isLoading,
    programDaysFourWeekQ.data,
    qc,
  ]);

  // Get active session if exists
  const activeSessionQ = useQuery({
    queryKey: ['training:session', activeSessionId],
    queryFn: () => (activeSessionId ? getTrainingSession(activeSessionId) : null),
    enabled: !!activeSessionId,
    retry: false,
  });

  // Check for in-progress session (started but not ended)
  const inProgressSession = useMemo(() => {
    if (!sessionsQ.data) return null;
    return (sessionsQ.data as any[]).find((s: any) => s.started_at && !s.ended_at) || null;
  }, [sessionsQ.data]);

  // Cast ProgramDayRow[] -> ProgramDay[] expected by WeekView/FourWeekPreview
  const programDaysWeekForUI = useMemo(() => {
    const raw = programDaysWeekQ.data || [];
    return raw.map((d: any) => ({
      ...d,
      template_key: (d.template_key as unknown) as SessionTemplate,
    }));
  }, [programDaysWeekQ.data]);

  const programDaysFourWeekForUI = useMemo(() => {
    const raw = programDaysFourWeekQ.data || [];
    return raw.map((d: any) => ({
      ...d,
      template_key: (d.template_key as unknown) as SessionTemplate,
    }));
  }, [programDaysFourWeekQ.data]);

  // Sync offline queue on mount
  useEffect(() => {
    syncOfflineQueue().catch(() => {
      // ignore
    });
  }, []);

  // Bucket 5: Post-setup reconcile - show loading state for N seconds after setup completion
  const isInPostSetupReconcile =
    setupJustCompletedAt !== null && Date.now() - setupJustCompletedAt < 10_000; // 10 seconds
  const shouldShowLoading =
    isInPostSetupReconcile ||
    profileQ.isLoading ||
    activeProgramQ.isLoading ||
    profileQ.isFetching ||
    activeProgramQ.isFetching;

  // ✅ FIX: hook must always run (never after early returns)
  useEffect(() => {
    if (setupJustCompletedAt !== null && profileQ.data && activeProgramQ.data) {
      setSetupJustCompletedAt(null);
    }
  }, [setupJustCompletedAt, profileQ.data, activeProgramQ.data]);

  // Start new session
  const startSessionMutation = useMutation({
    mutationFn: async ({ plan, programDay }: { plan: SessionPlan; programDay: any }) => {
      const sessionId = `training_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const program = activeProgramQ.data;

      // GoalWeights -> Record<string, number>
      const goalsRecord: Record<string, number> = ({ ...(plan.goals as any) } as unknown) as Record<
        string,
        number
      >;

      await createTrainingSession({
        id: sessionId,
        mode: 'timed',
        goals: goalsRecord,
        startedAt: new Date().toISOString(),
        programId: program?.id,
        programDayId: programDay.id,
        weekIndex: programDay.week_index,
        dayIndex: programDay.day_index,
        sessionTypeLabel: programDay.label,
      });

      const items = plan.exercises.map((ex, idx) => ({
        id: `${sessionId}_item_${idx}`,
        exerciseId: ex.exerciseId,
        orderIndex: ex.orderIndex,
        planned: {
          sets: ex.plannedSets,
          priority: ex.priority,
          intents: ex.intents,
          decisionTrace: ex.decisionTrace,
        },
      }));

      await createTrainingSessionItems(sessionId, items);

      await logTrainingEvent('training_session_generated', {
        sessionId,
        programDayId: programDay.id,
        label: programDay.label,
        exercisesCount: plan.exercises.length,
      }).catch(() => {});

      return { sessionId, plan };
    },
    onSuccess: (data) => {
      setActiveSessionId(data.sessionId);
      setShowPreview(false);
      setPendingPlan(null);
      setSelectedProgramDay(null);
      qc.invalidateQueries({ queryKey: ['training:sessions'] });
    },
    onError: (error: any) => {
      logger.warn('Failed to start training session', error);
      Alert.alert('Error', error?.message || 'Failed to start session');
      setShowPreview(false);
      setPendingPlan(null);
    },
  });

  const handleDayPress = useCallback(
    (programDay: any) => {
      // FIX: Check for active session before allowing new session preview
      if (inProgressSession) {
        Alert.alert(
          'Session in progress',
          `You have an active session from ${new Date(inProgressSession.started_at).toLocaleDateString()}. What would you like to do?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Resume session', onPress: () => setActiveSessionId(inProgressSession.id) },
            { text: 'End & save', onPress: async () => {
              // End the active session first, then allow preview
              // Note: User will need to confirm starting new session after ending current one
              try {
                await updateTrainingSession(inProgressSession.id, {
                  endedAt: new Date().toISOString(),
                });
                await qc.invalidateQueries({ queryKey: ['training:sessions'] });
                // Now allow preview to proceed
                setSelectedProgramDay(programDay);
                const profile = profileQ.data;
                const program = activeProgramQ.data;
                if (!profile || !program) return;
                const plan = buildSessionFromProgramDay(
                  {
                    label: programDay.label,
                    intents: programDay.intents,
                    template_key: programDay.template_key,
                  },
                  program.profile_snapshot,
                );
                setPendingPlan(plan);
                setShowPreview(true);
              } catch (error: any) {
                logger.warn('Failed to end active session', error);
                Alert.alert('Error', 'Failed to end active session. Please try again.');
              }
            }},
          ]
        );
        return;
      }

      setSelectedProgramDay(programDay);

      const profile = profileQ.data;
      const program = activeProgramQ.data;
      if (!profile || !program) return;

      const plan = buildSessionFromProgramDay(
        {
          label: programDay.label,
          intents: programDay.intents,
          template_key: programDay.template_key,
        },
        program.profile_snapshot,
      );

      setPendingPlan(plan);
      setShowPreview(true);
    },
    [profileQ.data, activeProgramQ.data, inProgressSession, qc],
  );

  const handleConfirmSession = useCallback(() => {
    if (!pendingPlan || !selectedProgramDay) return;

    // FIX: Double-check for active session before starting (defensive check)
    if (inProgressSession) {
      Alert.alert(
        'Session in progress',
        `You have an active session from ${new Date(inProgressSession.started_at).toLocaleDateString()}. Please resume or end it first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Resume session', onPress: () => setActiveSessionId(inProgressSession.id) },
        ]
      );
      return;
    }

    startSessionMutation.mutate({
      plan: pendingPlan,
      programDay: selectedProgramDay,
    });
  }, [pendingPlan, selectedProgramDay, startSessionMutation, inProgressSession]);

  const handleResumeSession = useCallback(() => {
    if (inProgressSession) {
      setActiveSessionId(inProgressSession.id);
    }
  }, [inProgressSession]);

  const weekNumber = useMemo(() => {
    try {
      const start = new Date(activeProgramQ.data?.start_date || new Date());
      const diff = new Date().getTime() - start.getTime();
      const wk = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
      return wk > 0 ? wk : 1;
    } catch {
      return 1;
    }
  }, [activeProgramQ.data?.start_date]);

  // Find next session (first program day >= today)
  const nextSession = useMemo(() => {
    if (!programDaysFourWeekQ.data || programDaysFourWeekQ.data.length === 0) return null;
    if (!profileQ.data || !activeProgramQ.data) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...(programDaysFourWeekQ.data as any[])]
      .filter((pd) => {
        const pdDate = new Date(pd.date);
        pdDate.setHours(0, 0, 0, 0);
        return pdDate >= today;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) return null;

    const nextDay = sorted[0];
    try {
      const plan = buildSessionFromProgramDay(
        {
          label: nextDay.label,
          intents: (nextDay.intents || []) as MovementIntent[],
          template_key: nextDay.template_key as SessionTemplate,
        },
        activeProgramQ.data.profile_snapshot,
      );
      return {
        programDay: nextDay,
        plan,
        date: new Date(nextDay.date),
      };
    } catch {
      return null;
    }
  }, [programDaysFourWeekQ.data, profileQ.data, activeProgramQ.data]);

  if (showSetup) {
    return (
      <TrainingSetupScreen
        onComplete={async () => {
          setShowSetup(false);
          // Bucket 5: Mark setup as just completed to show loading state instead of CTA
          setSetupJustCompletedAt(Date.now());
          // Invalidate and refetch queries to ensure fresh data
          await qc.invalidateQueries({ queryKey: ['training:profile'] });
          await qc.invalidateQueries({ queryKey: ['training:activeProgram'] });
          await qc.invalidateQueries({ queryKey: ['training:programDays:week'] });
          await qc.invalidateQueries({ queryKey: ['training:programDays:fourWeek'] });
          // Refetch immediately to avoid showing setup CTA
          await qc.refetchQueries({ queryKey: ['training:profile'] });
          await qc.refetchQueries({ queryKey: ['training:activeProgram'] });
        }}
      />
    );
  }

  if (showAnalytics) {
    return <TrainingAnalyticsScreen onClose={() => setShowAnalytics(false)} />;
  }

  if (activeSessionId && activeSessionQ.data) {
    return (
      <TrainingSessionView
        sessionId={activeSessionId}
        sessionData={activeSessionQ.data}
        onComplete={() => {
          setActiveSessionId(null);
          qc.invalidateQueries({ queryKey: ['training:sessions'] });
        }}
        onCancel={() => setActiveSessionId(null)}
      />
    );
  }

  if (shouldShowLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: appTheme.spacing.md, color: theme.colors.onSurfaceVariant }}>
          {isInPostSetupReconcile ? 'Loading your updated plan...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  // Guardrails - canonical setup CTA
  if (!profileQ.data || !activeProgramQ.data) {
    const hasError = profileQ.isError || activeProgramQ.isError;

    if (hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: appTheme.spacing.lg,
              paddingTop: appTheme.spacing.lg,
              paddingBottom: 140,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <InformationalCard>
              <FeatureCardHeader icon="alert-circle" title="Unable to load training plan" />
              <Text style={{ marginTop: 8, marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                There was an error loading your training profile. Please try again.
              </Text>
              {__DEV__ && (
                <Text style={{ marginBottom: 12, color: theme.colors.error, fontSize: 12 }}>
                  Profile: {profileQ.isError ? 'error' : 'ok'} | Program:{' '}
                  {activeProgramQ.isError ? 'error' : 'ok'}
                </Text>
              )}
              <Button
                mode="contained"
                onPress={() => {
                  qc.invalidateQueries({ queryKey: ['training:profile'] });
                  qc.invalidateQueries({ queryKey: ['training:activeProgram'] });
                }}
              >
                Retry
              </Button>
            </InformationalCard>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: appTheme.spacing.lg,
            paddingTop: appTheme.spacing.lg,
            paddingBottom: 140,
          }}
        >
          <InformationalCard>
            <FeatureCardHeader icon="dumbbell" title="Training Setup" subtitle="Get started in 60 seconds" />
            <Text style={{ marginTop: 8, marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
              {!profileQ.data
                ? 'Set up your training profile to get personalized workout recommendations based on your goals, equipment, and experience level.'
                : 'Create your 4-week training program to get started.'}
            </Text>
            <Button mode="contained" onPress={() => setShowSetup(true)}>
              {!profileQ.data ? 'Start setup' : 'Create program'}
            </Button>
          </InformationalCard>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Tab switcher + Edit Program button */}
      <View
        style={{
          paddingHorizontal: appTheme.spacing.lg,
          paddingTop: appTheme.spacing.lg,
          paddingBottom: appTheme.spacing.sm,
          flexDirection: 'row',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <Button
          mode={activeTab === 'today' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('today')}
          style={{ flex: 1 }}
        >
          Today
        </Button>
        <Button
          mode={activeTab === 'history' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('history')}
          style={{ flex: 1 }}
        >
          History
        </Button>
        <IconButton
          icon="chart-line"
          size={24}
          onPress={() => setShowAnalytics(true)}
          accessibilityLabel="View analytics"
        />
        <IconButton
          icon="cog"
          size={24}
          onPress={() => setShowSetup(true)}
          accessibilityLabel="Edit training program"
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: appTheme.spacing.lg,
          paddingTop: appTheme.spacing.lg,
          paddingBottom: 140,
        }}
      >
        {activeTab === 'today' ? (
          <>
            {inProgressSession ? (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <ActionCard>
                  <FeatureCardHeader icon="dumbbell" title="Session in progress" />
                  <Text
                    style={{
                      marginTop: appTheme.spacing.sm,
                      marginBottom: appTheme.spacing.md,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    You have an active session. Resume to continue logging sets.
                  </Text>
                  <Button mode="contained" onPress={handleResumeSession}>
                    Resume session
                  </Button>
                </ActionCard>
              </View>
            ) : nextSession ? (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <Card
                  mode="elevated"
                  style={{
                    backgroundColor: theme.colors.primaryContainer,
                    borderRadius: appTheme.borderRadius.xl,
                  }}
                  onPress={() => handleDayPress(nextSession.programDay)}
                >
                  <Card.Content style={{ padding: appTheme.spacing.md }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: appTheme.spacing.sm,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="titleMedium"
                          style={{
                            fontWeight: '700',
                            color: theme.colors.onPrimaryContainer,
                            marginBottom: appTheme.spacing.xs,
                          }}
                        >
                          Next Session
                        </Text>

                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onPrimaryContainer, marginBottom: appTheme.spacing.xs }}
                        >
                          {(() => {
                            const day = nextSession.programDay;
                            if (day.week_index && day.day_index !== undefined) {
                              return `Week ${day.week_index} • Day ${day.day_index} — ${day.label}`;
                            }
                            return day.label;
                          })()}
                        </Text>

                        {(() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const sessionDate = new Date(nextSession.date);
                          sessionDate.setHours(0, 0, 0, 0);

                          let dateLabel = 'Today';
                          if (!isSameDay(sessionDate, today)) {
                            const tomorrow = addDays(today, 1);
                            if (isSameDay(sessionDate, tomorrow)) {
                              dateLabel = 'Tomorrow';
                            } else {
                              dateLabel = sessionDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              });
                            }
                          }

                          return (
                            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
                              {dateLabel}
                            </Text>
                          );
                        })()}
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          gap: appTheme.spacing.xs,
                          flexWrap: 'wrap',
                          justifyContent: 'flex-end',
                          maxWidth: '50%',
                        }}
                      >
                        {getPrimaryIntentLabels((nextSession.programDay.intents || []) as MovementIntent[], 2).map(
                          (label, idx) => (
                            <Chip
                              key={`next_${idx}`}
                              mode="flat"
                              textStyle={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: theme.colors.onPrimary,
                              }}
                              style={{
                                backgroundColor: theme.colors.primary,
                              }}
                            >
                              {label}
                            </Chip>
                          ),
                        )}
                      </View>
                    </View>

                    {nextSession.plan.estimatedDurationMinutes ? (
                      <Text
                        variant="bodySmall"
                        style={{
                          color: theme.colors.onPrimaryContainer,
                          opacity: 0.8,
                          marginBottom: appTheme.spacing.sm,
                        }}
                      >
                        ~{nextSession.plan.estimatedDurationMinutes} min
                      </Text>
                    ) : null}

                    <Button
                      mode="contained"
                      compact
                      onPress={() => handleDayPress(nextSession.programDay)}
                      style={{ marginTop: appTheme.spacing.xs }}
                      buttonColor={theme.colors.primary}
                      textColor={theme.colors.onPrimary}
                    >
                      {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const sessionDate = new Date(nextSession.date);
                        sessionDate.setHours(0, 0, 0, 0);
                        if (isSameDay(sessionDate, today)) return 'Start';
                        if (isPast(sessionDate, today)) return 'Review';
                        return 'Preview';
                      })()}
                    </Button>
                  </Card.Content>
                </Card>
              </View>
            ) : null}

            {/* Current Week header + navigation */}
            <View style={{ marginBottom: appTheme.spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: appTheme.spacing.sm,
                }}
              >
                <View>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    This Week
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Week {weekNumber} • {toYMD(weekStart)} → {toYMD(weekEnd)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button mode="outlined" compact onPress={() => setCurrentWeekAnchor((prev) => addDays(prev, -7))}>
                    Prev
                  </Button>
                  <Button mode="outlined" compact onPress={() => setCurrentWeekAnchor((prev) => addDays(prev, 7))}>
                    Next
                  </Button>
                </View>
              </View>

              {programDaysWeekQ.isLoading ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator />
                </View>
              ) : (
                <WeekView
                  programDays={programDaysWeekForUI as any}
                  currentDate={currentWeekAnchor}
                  onDayPress={handleDayPress}
                />
              )}
            </View>

            {/* 4-Week Preview */}
            <View style={{ marginBottom: appTheme.spacing.lg }}>
              <Text
                variant="titleMedium"
                style={{ fontWeight: '700', marginBottom: appTheme.spacing.md, color: theme.colors.onSurface }}
              >
                4-Week Program
              </Text>

              {programDaysFourWeekQ.isLoading ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator />
                </View>
              ) : (
                <FourWeekPreview programDays={programDaysFourWeekForUI as any} />
              )}
            </View>

            {/* Recent sessions */}
            {sessionsQ.isLoading ? (
              <View style={{ paddingVertical: 24 }}>
                <ActivityIndicator />
              </View>
            ) : sessionsQ.data && sessionsQ.data.length > 0 ? (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <Text
                  variant="titleMedium"
                  style={{ marginBottom: appTheme.spacing.md, fontWeight: '700', color: theme.colors.onSurface }}
                >
                  Recent sessions
                </Text>

                {(sessionsQ.data as any[]).slice(0, 5).map((s: any) => (
                  <Card
                    key={s.id}
                    mode="outlined"
                    style={{
                      marginBottom: appTheme.spacing.sm,
                      backgroundColor: theme.colors.surface,
                      borderRadius: appTheme.borderRadius.xl,
                    }}
                    onPress={() => {
                      setHistorySelectedSessionId(s.id);
                      setActiveTab('history');
                    }}
                  >
                    <Card.Content>
                      <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                        {s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Session'}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}
                      >
                        {s.mode === 'timed' ? 'Timed' : 'Manual'} • {Object.keys(s.goals || {}).length} goals
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <TrainingHistoryView sessions={(sessionsQ.data as any[]) || []} isLoading={sessionsQ.isLoading} />
        )}
      </ScrollView>

      {/* Session Preview Modal */}
      <SessionPreviewModal
        visible={showPreview}
        plan={pendingPlan}
        onConfirm={handleConfirmSession}
        onCancel={() => {
          setShowPreview(false);
          setPendingPlan(null);
        }}
      />
    </View>
  );
}
