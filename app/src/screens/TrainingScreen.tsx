// Training Screen - Main entry point for training module
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, Card, Text, useTheme, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { InformationalCard, ActionCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { useAppTheme } from '@/theme';
import { buildSession, buildSessionFromProgramDay, getExerciseCatalog } from '@/lib/training/engine';
import {
  createTrainingSession,
  createTrainingSessionItems,
  listTrainingSessions,
  getTrainingSession,
  getTrainingProfile,
  logTrainingEvent,
  getActiveProgramInstance,
  getProgramDays,
  getProgramDayByDate,
  type TrainingSessionRow,
} from '@/lib/api';
import { syncOfflineQueue } from '@/lib/training/offlineSync';
import TrainingSetupScreen from './training/TrainingSetupScreen';
import type {
  BuildSessionInput,
  SessionPlan,
  TrainingGoal,
  SessionTemplate,
  TrainingConstraints,
  UserState,
} from '@/lib/training/types';
import { logger } from '@/lib/logger';
import { useAuth } from '@/providers/AuthProvider';
import TrainingSessionView from '@/components/training/TrainingSessionView';
import TrainingHistoryView from '@/components/training/TrainingHistoryView';
import SessionPreviewModal from '@/components/training/SessionPreviewModal';
import WeekView from '@/components/training/WeekView';
import FourWeekPreview from '@/components/training/FourWeekPreview';

type Tab = 'today' | 'history';

export default function TrainingScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const { session } = useAuth();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<SessionPlan | null>(null);
  const [selectedProgramDay, setSelectedProgramDay] = useState<any | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

  // Load profile
  const profileQ = useQuery({
    queryKey: ['training:profile'],
    queryFn: () => getTrainingProfile(),
    retry: false,
    staleTime: 60000,
  });

  // Load active program
  const activeProgramQ = useQuery({
    queryKey: ['training:activeProgram'],
    queryFn: () => getActiveProgramInstance(),
    retry: false,
    staleTime: 300000,
  });

  // Load program days for current week
  const weekStart = useMemo(() => {
    const date = new Date(currentWeekStart);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [currentWeekStart]);

  const weekEnd = useMemo(() => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + 6);
    return date;
  }, [weekStart]);

  const programDaysQ = useQuery({
    queryKey: ['training:programDays', activeProgramQ.data?.id, weekStart.toISOString()],
    queryFn: () => {
      if (!activeProgramQ.data) return [];
      return getProgramDays(
        activeProgramQ.data.id,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0],
      );
    },
    enabled: !!activeProgramQ.data,
    staleTime: 300000,
  });

  // Load sessions
  const sessionsQ = useQuery({
    queryKey: ['training:sessions'],
    queryFn: () => listTrainingSessions(50),
    retry: false,
    staleTime: 30000,
  });

  // Get active session if exists
  const activeSessionQ = useQuery({
    queryKey: ['training:session', activeSessionId],
    queryFn: () => (activeSessionId ? getTrainingSession(activeSessionId) : null),
    enabled: !!activeSessionId,
    retry: false,
  });

  // Check for in-progress session
  const inProgressSession = useMemo(() => {
    if (!sessionsQ.data) return null;
    return sessionsQ.data.find((s) => s.started_at && !s.ended_at) || null;
  }, [sessionsQ.data]);

  // Sync offline queue on mount
  useEffect(() => {
    syncOfflineQueue().catch(() => {
      // Ignore sync errors on mount
    });
  }, []);

  // Start new session
  const startSessionMutation = useMutation({
    mutationFn: async ({ plan, programDay }: { plan: SessionPlan; programDay: any }) => {
      const sessionId = `training_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const program = activeProgramQ.data;

      // Create session linked to program day
      await createTrainingSession({
        id: sessionId,
        mode: 'timed',
        goals: plan.goals,
        startedAt: new Date().toISOString(),
        programId: program?.id,
        programDayId: programDay.id,
        weekIndex: programDay.week_index,
        dayIndex: programDay.day_index,
        sessionTypeLabel: programDay.label,
      });

      // Create session items
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

  const handleDayPress = useCallback((programDay: any) => {
    setSelectedProgramDay(programDay);
    
    // Generate session plan from program day
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
  }, [profileQ.data, activeProgramQ.data]);

  const handleConfirmSession = useCallback(() => {
    if (!pendingPlan || !selectedProgramDay) return;
    
    startSessionMutation.mutate({
      plan: pendingPlan,
      programDay: selectedProgramDay,
    });
  }, [pendingPlan, selectedProgramDay, startSessionMutation]);

  const handleResumeSession = useCallback(() => {
    if (inProgressSession) {
      setActiveSessionId(inProgressSession.id);
    }
  }, [inProgressSession]);

  if (showSetup) {
    return (
      <TrainingSetupScreen
        onComplete={() => {
          setShowSetup(false);
          qc.invalidateQueries({ queryKey: ['training:profile'] });
        }}
      />
    );
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
        onCancel={() => {
          setActiveSessionId(null);
        }}
      />
    );
  }

  // Show setup CTA if no profile or no active program
  if (!profileQ.isLoading && (!profileQ.data || !activeProgramQ.data)) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: appTheme.spacing.lg, paddingTop: appTheme.spacing.lg, paddingBottom: 140 }}
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
      <View style={{ paddingHorizontal: appTheme.spacing.lg, paddingTop: appTheme.spacing.lg, paddingBottom: appTheme.spacing.sm }}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as Tab)}
          buttons={[
            { value: 'today', label: 'Today' },
            { value: 'history', label: 'History' },
          ]}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: appTheme.spacing.lg, paddingTop: appTheme.spacing.lg, paddingBottom: 140 }}
      >
        {activeTab === 'today' ? (
          <>
            {inProgressSession ? (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <ActionCard>
                  <FeatureCardHeader icon="dumbbell" title="Session in progress" />
                  <Text style={{ marginTop: appTheme.spacing.sm, marginBottom: appTheme.spacing.md, color: theme.colors.onSurfaceVariant }}>
                    You have an active session. Resume to continue logging sets.
                  </Text>
                  <Button mode="contained" onPress={handleResumeSession}>
                    Resume session
                  </Button>
                </ActionCard>
              </View>
            ) : null}

            {/* Current Week View */}
            {activeProgramQ.data && programDaysQ.data ? (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: appTheme.spacing.md, paddingHorizontal: appTheme.spacing.lg }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    This Week
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Week {Math.ceil((new Date().getTime() - new Date(activeProgramQ.data.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)) || 1}
                  </Text>
                </View>
                <WeekView
                  programDays={programDaysQ.data}
                  currentDate={currentWeekStart}
                  onDayPress={handleDayPress}
                />
              </View>
            ) : (
              <View style={{ marginBottom: appTheme.spacing.lg, paddingHorizontal: appTheme.spacing.lg }}>
                <InformationalCard>
                  <FeatureCardHeader icon="calendar-blank" title="No active program" />
                  <Text style={{ marginTop: 8, marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                    Create a 4-week training program to get started.
                  </Text>
                  <Button mode="contained" onPress={() => setShowSetup(true)}>
                    Create program
                  </Button>
                </InformationalCard>
              </View>
            )}

            {/* 4-Week Preview */}
            {activeProgramQ.data && (
              <View style={{ marginBottom: appTheme.spacing.lg, paddingHorizontal: appTheme.spacing.lg }}>
                <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: appTheme.spacing.md, color: theme.colors.onSurface }}>
                  4-Week Program
                </Text>
                <FourWeekPreview programDays={programDaysQ.data || []} />
              </View>
            )}

            {sessionsQ.isLoading ? (
              <View style={{ paddingVertical: 24 }}>
                <ActivityIndicator />
              </View>
            ) : sessionsQ.data && sessionsQ.data.length > 0 ? (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <Text variant="titleMedium" style={{ marginBottom: appTheme.spacing.md, fontWeight: '700', color: theme.colors.onSurface }}>
                  Recent sessions
                </Text>
                {sessionsQ.data.slice(0, 5).map((s) => (
                  <Card
                    key={s.id}
                    mode="outlined"
                    style={{ marginBottom: appTheme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: appTheme.borderRadius.xl }}
                    onPress={() => {
                      setActiveSessionId(s.id);
                      setActiveTab('history');
                    }}
                  >
                    <Card.Content>
                      <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                        {s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Session'}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                        {s.mode === 'timed' ? 'Timed' : 'Manual'} • {Object.keys(s.goals).length} goals
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <TrainingHistoryView sessions={sessionsQ.data || []} isLoading={sessionsQ.isLoading} />
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
