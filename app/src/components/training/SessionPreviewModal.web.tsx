import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Modal, Portal, Text, useTheme } from 'react-native-paper';
import type { SessionPlan } from '@/lib/training/types';
import { formatExercisePreviewLine } from '@/lib/training/loadDisplayFormat';

// Web keeps the same preview contract, with manual logging as its only capability.
export default function SessionPreviewModal({ visible, plan, onConfirm, onCancel }: {
  visible: boolean; plan: SessionPlan | null; sessionMode: 'normal' | 'guided';
  onSessionModeChange: (mode: 'normal' | 'guided') => void;
  onConfirm: () => void; onCancel: () => void;
  weeklySetsLine?: string | null; diagnosticLocation?: unknown;
}) {
  const theme = useTheme();
  if (!visible || !plan) return null;
  const blocked = plan.programmeValidation?.status === 'infeasible';
  return <Portal><Modal visible onDismiss={onCancel} contentContainerStyle={{
    backgroundColor: theme.colors.surface, alignSelf: 'center', width: '94%', maxWidth: 650,
    maxHeight: '85%', padding: 20, borderRadius: 16,
  }}>
    <Text variant="headlineSmall" accessibilityRole="header">Session Preview</Text>
    <Text style={{ marginVertical: 12 }}>Manual set logging · no rest alarms</Text>
    <ScrollView>
      {plan.programmeValidation?.issues.map((issue, index) => <Text key={index}>{issue.message}</Text>)}
      {plan.exercises.map(exercise => <View key={exercise.exerciseId} style={{ marginVertical: 12 }}>
        <Text variant="titleMedium">{exercise.exercise.name}</Text>
        <Text>{formatExercisePreviewLine(exercise, exercise.exercise)}</Text>
      </View>)}
    </ScrollView>
    <Button mode="contained" disabled={blocked || !plan.exercises.length} onPress={onConfirm}>Start manual session</Button>
    <Button onPress={onCancel}>Back to weekly plan</Button>
  </Modal></Portal>;
}
