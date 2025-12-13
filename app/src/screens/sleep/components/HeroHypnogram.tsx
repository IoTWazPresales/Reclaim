import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { StageSegment } from '../SleepStagesBar';
import { TimelineWithLabels } from './TimelineWithLabels';

type Props = {
  stages?: StageSegment[] | null;
  startTime?: string | Date;
  endTime?: string | Date;
};

export function HeroHypnogram({ stages, startTime, endTime }: Props) {
  const theme = useTheme();
  const hasTimeline = Array.isArray(stages) && stages.some((seg) => seg.start && seg.end);

  if (!hasTimeline) {
    return (
      <View style={{ marginTop: 12 }}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>No stage timeline</Text>
      </View>
    );
  }

  const startLabel = startTime
    ? new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : undefined;
  const endLabel = endTime
    ? new Date(endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : undefined;

  return (
    <View style={{ marginTop: 12 }}>
      <TimelineWithLabels stages={stages as StageSegment[]} startLabel={startLabel} endLabel={endLabel} height={12} />
    </View>
  );
}


