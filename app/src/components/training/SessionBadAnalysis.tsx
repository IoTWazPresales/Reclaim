// Session Bad Analysis - Deterministic correlates for poor performance
import React from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme, Chip } from 'react-native-paper';
import { useAppTheme } from '@/theme';

interface SessionBadAnalysisProps {
  sessionDate: string;
  sleepHours?: number;
  moodScore?: number;
  stressLevel?: number;
}

export default function SessionBadAnalysis({
  sessionDate,
  sleepHours,
  moodScore,
  stressLevel,
}: SessionBadAnalysisProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  const correlates: string[] = [];

  if (sleepHours !== undefined && sleepHours < 6) {
    correlates.push(`Low sleep (${sleepHours.toFixed(1)}h)`);
  }

  if (moodScore !== undefined && moodScore < 3) {
    correlates.push('Low mood');
  }

  if (stressLevel !== undefined && stressLevel > 7) {
    correlates.push('High stress');
  }

  if (correlates.length === 0) {
    correlates.push('No clear correlates detected');
  }

  return (
    <Card mode="outlined" style={{ marginBottom: appTheme.spacing.md, backgroundColor: theme.colors.errorContainer }}>
      <Card.Content>
        <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onErrorContainer }}>
          Why this session might have been difficult
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.xs }}>
          {correlates.map((correlate, index) => (
            <Chip key={index} compact style={{ backgroundColor: theme.colors.error }}>
              <Text style={{ color: theme.colors.onError, fontSize: 12 }}>{correlate}</Text>
            </Chip>
          ))}
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, marginTop: appTheme.spacing.sm }}>
          These are correlates, not causes. Recovery and consistency matter most.
        </Text>
      </Card.Content>
    </Card>
  );
}
