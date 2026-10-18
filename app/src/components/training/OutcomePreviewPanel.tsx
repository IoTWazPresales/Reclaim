// Outcome Preview Panel - Shows live preview of training generation
import React, { useMemo } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { useTheme, Card, Text } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { generatePreview, type PreviewSettings } from '@/lib/training/preview';

type OutcomePreviewPanelProps = PreviewSettings;

export function OutcomePreviewPanel({
  goals,
  selectedWeekdays,
  equipment,
  constraints,
  baselines,
  muscleFrequency = 'auto',
  baselineReps, experienceLevel, includeSkillWork, trainingMode, runningGoal, runningDistanceKm,
}: OutcomePreviewPanelProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const { height: winH } = useWindowDimensions();
  const bodyMaxH = Math.min(260, winH * 0.32);

  const preview = useMemo(() => {
    const settings: PreviewSettings = {
      goals,
      selectedWeekdays,
      equipment,
      constraints,
      baselines,
      muscleFrequency, baselineReps, experienceLevel, includeSkillWork, trainingMode, runningGoal, runningDistanceKm,
    };
    return generatePreview(settings);
  }, [goals, selectedWeekdays, equipment, constraints, baselines, muscleFrequency, baselineReps, experienceLevel, includeSkillWork, trainingMode, runningGoal, runningDistanceKm]);

  if (!preview) {
    return (
      <Card style={{ marginTop: 16, padding: 16 }}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          {selectedWeekdays.length === 0
            ? 'Select training days to see preview'
            : 'Preview unavailable. Review your training setup before confirming.'}
        </Text>
      </Card>
    );
  }

  return (
    <Card
      style={{
        marginTop: appTheme.spacing.lg,
        padding: appTheme.spacing.md,
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: appTheme.borderRadius.lg,
      }}
    >
      <Text
        variant="titleMedium"
        style={{
          marginBottom: appTheme.spacing.sm,
          fontWeight: '700',
          color: theme.colors.onSurface,
        }}
      >
        Outcome Preview
      </Text>

      <ScrollView style={{ maxHeight: bodyMaxH }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {preview.runningDurationMinutes !== null ? (
          <View>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              Preview session: {preview.runningDurationMinutes} minutes of running and walking.
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Your distance goal does not prescribe a pace or determine these minutes. Nothing is saved until you confirm.
            </Text>
          </View>
        ) : (
          <>
        {/* Grouping Style */}
        <View style={{ marginBottom: appTheme.spacing.md }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            Split Style
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
            {preview.groupingStyle}
          </Text>
        </View>

        {/* Rep Ranges */}
        <View style={{ marginBottom: appTheme.spacing.md }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            Rep Ranges
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm }}>
            {preview.repRanges.primary && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface, flexShrink: 1 }}>
                Primary: {preview.repRanges.primary[0]}-{preview.repRanges.primary[1]}
              </Text>
            )}
            {preview.repRanges.accessory && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface, flexShrink: 1 }}>
                Accessory: {preview.repRanges.accessory[0]}-{preview.repRanges.accessory[1]}
              </Text>
            )}
            {preview.repRanges.isolation && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface, flexShrink: 1 }}>
                Isolation: {preview.repRanges.isolation[0]}-{preview.repRanges.isolation[1]}
              </Text>
            )}
          </View>
        </View>

        {/* Set Counts */}
        <View style={{ marginBottom: appTheme.spacing.md }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            Sets per Session
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            {preview.setCounts.total} total ({preview.setCounts.primary} primary, {preview.setCounts.accessory} accessory,{' '}
            {preview.setCounts.isolation} isolation)
          </Text>
        </View>

        {/* AMRAP */}
        {preview.hasAMRAP && (
          <View style={{ marginBottom: appTheme.spacing.md }}>
            <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              ✓ Includes AMRAP sets
            </Text>
          </View>
        )}

        {/* Example Snippet */}
        <View style={{ paddingBottom: appTheme.spacing.xs }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            Example Exercise
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontStyle: 'italic' }}>
            {preview.exampleSnippet}
          </Text>
        </View>
          </>
        )}
      </ScrollView>
    </Card>
  );
}
