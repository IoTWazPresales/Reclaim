// Training Screen - Main entry point for training module
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, Card, Text, useTheme, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { InformationalCard, ActionCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { useAppTheme } from '@/theme';
import { buildSession, getExerciseCatalog } from '@/lib/training/engine';
import {
  createTrainingSession,
  createTrainingSessionItems,
  listTrainingSessions,
  getTrainingSession,
  getTrainingProfile,
  logTrainingEvent,
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

  // Load profile
  const profileQ = useQuery({
    queryKey: ['training:profile'],
    queryFn: () => getTrainingProfile(),
    retry: false,
    staleTime: 60000,
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
    mutationFn: async (input: BuildSessionInput) => {
      const plan = buildSession(input);
      const sessionId = `training_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      // Create session
      await createTrainingSession({
        id: sessionId,
        mode: 'timed',
        goals: input.goals,
        startedAt: new Date().toISOString(),
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
        template: input.template,
        exercisesCount: plan.exercises.length,
      }).catch(() => {});

      return { sessionId, plan };
    },
    onSuccess: (data) => {
      setActiveSessionId(data.sessionId);
      setShowPreview(false);
      setPendingPlan(null);
      qc.invalidateQueries({ queryKey: ['training:sessions'] });
    },
    onError: (error: any) => {
      logger.warn('Failed to start training session', error);
      Alert.alert('Error', error?.message || 'Failed to start session');
      setShowPreview(false);
      setPendingPlan(null);
    },
  });

  const handleStartSession = useCallback(async () => {
    const profile = profileQ.data;
    
    // Try to get scheduled template for today
    let template: SessionTemplate = 'full_body';
    try {
      const { getScheduledTemplateForToday } = await import('@/lib/training/scheduler');
      const scheduledTemplate = await getScheduledTemplateForToday();
      if (scheduledTemplate) {
        template = scheduledTemplate;
      }
    } catch (error) {
      logger.warn('Failed to get scheduled template', error);
    }
    
    // Use profile if available, otherwise defaults
    const input: BuildSessionInput = {
      template,
      goals: profile?.goals || {
        build_muscle: 0.5,
        build_strength: 0.3,
        lose_fat: 0.2,
        get_fitter: 0.0,
      },
      constraints: {
        availableEquipment: profile?.equipment_access || ['barbell', 'dumbbells', 'bench', 'cable_machine', 'pull_up_bar'],
        injuries: profile?.constraints?.injuries || [],
        forbiddenMovements: profile?.constraints?.forbiddenMovements || [],
        timeBudgetMinutes: 60,
      },
      userState: {
        experienceLevel: 'intermediate', // TODO: infer from baselines or ask in setup
        estimated1RM: profile?.baselines || {},
      },
    };

    // Generate plan and show preview
    const plan = buildSession(input);
    setPendingPlan(plan);
    setShowPreview(true);
  }, [profileQ.data]);

  const handleConfirmSession = useCallback(() => {
    if (!pendingPlan) return;
    
    const profile = profileQ.data;
    const input: BuildSessionInput = {
      template: pendingPlan.template,
      goals: pendingPlan.goals,
      constraints: pendingPlan.constraints,
      userState: pendingPlan.userState,
    };
    
    startSessionMutation.mutate(input);
  }, [pendingPlan, profileQ.data, startSessionMutation]);

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

  // Show setup CTA if no profile
  if (!profileQ.isLoading && !profileQ.data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: appTheme.spacing.lg, paddingTop: appTheme.spacing.lg, paddingBottom: 140 }}
        >
          <InformationalCard>
            <FeatureCardHeader icon="dumbbell" title="Training Setup" subtitle="Get started in 60 seconds" />
            <Text style={{ marginTop: 8, marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
              Set up your training profile to get personalized workout recommendations based on your goals, equipment,
              and experience level.
            </Text>
            <Button mode="contained" onPress={() => setShowSetup(true)}>
              Start setup
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
            ) : (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <InformationalCard>
                  <FeatureCardHeader icon="dumbbell" title="Training" subtitle="Intelligent, explainable workouts." />
                  <Text style={{ marginTop: 8, marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                    Generate a workout based on your goals, available equipment, and experience level. Every exercise
                    selection is explainable.
                  </Text>
                  <Button
                    mode="contained"
                    onPress={handleStartSession}
                    loading={startSessionMutation.isPending}
                    disabled={startSessionMutation.isPending}
                  >
                    Generate session
                  </Button>
                </InformationalCard>
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
