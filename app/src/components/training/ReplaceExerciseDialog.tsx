import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { listExercises } from '@/lib/training/engine';
import type { DecisionTrace, Exercise } from '@/lib/training/types';

export type ReplaceExerciseScope = 'session' | 'program';

type Props = {
  visible: boolean;
  exercise: Exercise;
  decisionTrace?: DecisionTrace | null;
  onDismiss: () => void;
  onReplace: (params: { newExerciseId: string; scope: ReplaceExerciseScope }) => void;
};

/**
 * Shared replace-exercise flow (ranked alternatives + session vs program scope).
 * Used from ExerciseCard and SetFocus / session shell so swap is reachable in-session.
 */
export default function ReplaceExerciseDialog({ visible, exercise, decisionTrace, onDismiss, onReplace }: Props) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [selectedReplacementId, setSelectedReplacementId] = useState<string | null>(null);

  const replacementEntries = React.useMemo(() => {
    if (!decisionTrace) return [] as { id: string; label: string }[];
    if (decisionTrace.rankedAlternativeIds?.length) {
      return decisionTrace.rankedAlternativeIds.slice(0, 10).flatMap((altId) => {
        const ex = listExercises().find((e) => e.id === altId);
        return ex ? [{ id: ex.id, label: ex.name }] : [];
      });
    }
    return (decisionTrace.rankedAlternatives || []).slice(0, 10).flatMap((altName) => {
      const ex = listExercises().find((e) => e.name === altName);
      return ex ? [{ id: ex.id, label: altName }] : [];
    });
  }, [decisionTrace]);

  useEffect(() => {
    if (!visible) setSelectedReplacementId(null);
  }, [visible]);

  const handleDismiss = () => {
    setSelectedReplacementId(null);
    onDismiss();
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={handleDismiss}
        style={{
          maxHeight: '80%',
          borderRadius: appTheme.borderRadius.xl,
          backgroundColor: theme.colors.elevation.level3,
        }}
      >
        <Dialog.Title>Replace exercise</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView style={{ maxHeight: 400 }}>
            <View style={{ padding: appTheme.spacing.lg }}>
              {selectedReplacementId ? (
                <>
                  <Text variant="bodyMedium" style={{ marginBottom: appTheme.spacing.md, color: theme.colors.onSurface }}>
                    Replace {exercise.name} with{' '}
                    {listExercises().find((e) => e.id === selectedReplacementId)?.name || 'this exercise'}?
                  </Text>
                  <Text variant="bodySmall" style={{ marginBottom: appTheme.spacing.md, color: theme.colors.onSurfaceVariant }}>
                    Choose where to apply this change:
                  </Text>
                  <View style={{ gap: appTheme.spacing.sm }}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        onReplace({ newExerciseId: selectedReplacementId, scope: 'session' });
                        setSelectedReplacementId(null);
                      }}
                      style={{ marginBottom: appTheme.spacing.xs }}
                    >
                      This session only
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => {
                        onReplace({ newExerciseId: selectedReplacementId, scope: 'program' });
                        setSelectedReplacementId(null);
                      }}
                      style={{ marginBottom: appTheme.spacing.xs }}
                    >
                      Update program
                    </Button>
                    <Button mode="text" onPress={() => setSelectedReplacementId(null)}>
                      Back
                    </Button>
                  </View>
                </>
              ) : replacementEntries.length > 0 ? (
                <>
                  <Text variant="bodyMedium" style={{ marginBottom: appTheme.spacing.md, color: theme.colors.onSurface }}>
                    Suggested replacements for {exercise.name}:
                  </Text>
                  {replacementEntries.map((row, idx) => (
                    <Button
                      key={`${row.id}-${idx}`}
                      mode="outlined"
                      onPress={() => setSelectedReplacementId(row.id)}
                      style={{ marginBottom: appTheme.spacing.sm }}
                      contentStyle={{ justifyContent: 'flex-start', paddingHorizontal: appTheme.spacing.md }}
                    >
                      {row.label}
                    </Button>
                  ))}
                  {decisionTrace?.alternativesSummary && decisionTrace.alternativesSummary.length > 0 && (
                    <View style={{ marginTop: appTheme.spacing.md }}>
                      {decisionTrace.alternativesSummary.map((alt, idx) => (
                        <Text
                          key={idx}
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}
                        >
                          {alt.name}: {alt.reason}
                        </Text>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No replacement suggestions available for this exercise.
                </Text>
              )}
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={handleDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
