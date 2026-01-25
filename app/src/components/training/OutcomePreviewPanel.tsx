// Outcome Preview Panel - Shows live preview of training generation
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme, Card, Text } from 'react-native-paper';
import { generatePreview, type PreviewSettings } from '@/lib/training/preview';
import type { TrainingGoal } from '@/lib/training/types';

interface OutcomePreviewPanelProps {
  goals: Record<TrainingGoal, number>;
  selectedWeekdays: number[]; // UI weekdays: 1=Mon, 7=Sun
  equipment: string[];
  constraints: string[];
  baselines: Record<string, number>;
}

export function OutcomePreviewPanel({
  goals,
  selectedWeekdays,
  equipment,
  constraints,
  baselines,
}: OutcomePreviewPanelProps) {
  const theme = useTheme();

  const preview = useMemo(() => {
    const settings: PreviewSettings = {
      goals,
      selectedWeekdays,
      equipment,
      constraints,
      baselines,
    };
    return generatePreview(settings);
  }, [goals, selectedWeekdays, equipment, constraints, baselines]);

  if (!preview) {
    return (
      <Card style={{ marginTop: 16, padding: 16 }}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Select training days to see preview
        </Text>
      </Card>
    );
  }

  return (
    <Card style={{ marginTop: 16, padding: 16, backgroundColor: theme.colors.surfaceVariant }}>
      <Text
        variant="titleMedium"
        style={{
          marginBottom: 12,
          fontWeight: '700',
          color: theme.colors.onSurface,
        }}
      >
        Outcome Preview
      </Text>

      {/* Grouping Style */}
      <View style={{ marginBottom: 12 }}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
          Split Style
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
          {preview.groupingStyle}
        </Text>
      </View>

      {/* Rep Ranges */}
      <View style={{ marginBottom: 12 }}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
          Rep Ranges
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {preview.repRanges.primary && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
              Primary: {preview.repRanges.primary[0]}-{preview.repRanges.primary[1]}
            </Text>
          )}
          {preview.repRanges.accessory && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
              Accessory: {preview.repRanges.accessory[0]}-{preview.repRanges.accessory[1]}
            </Text>
          )}
          {preview.repRanges.isolation && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
              Isolation: {preview.repRanges.isolation[0]}-{preview.repRanges.isolation[1]}
            </Text>
          )}
        </View>
      </View>

      {/* Set Counts */}
      <View style={{ marginBottom: 12 }}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
          Sets per Session
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
          {preview.setCounts.total} total ({preview.setCounts.primary} primary, {preview.setCounts.accessory} accessory, {preview.setCounts.isolation} isolation)
        </Text>
      </View>

      {/* AMRAP */}
      {preview.hasAMRAP && (
        <View style={{ marginBottom: 12 }}>
          <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
            ✓ Includes AMRAP sets
          </Text>
        </View>
      )}

      {/* Example Snippet */}
      <View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
          Example Exercise
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontStyle: 'italic' }}>
          {preview.exampleSnippet}
        </Text>
      </View>
    </Card>
  );
}
