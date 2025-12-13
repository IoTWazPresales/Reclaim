import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { StageSegment } from '../SleepStagesBar';

const STAGE_COLORS: Record<string, string> = {
  awake: '#f4b400',
  light: '#64b5f6',
  deep: '#1e88e5',
  rem: '#ab47bc',
  unknown: '#b0bec5',
};

export function MiniStageTimeline({ stages }: { stages: StageSegment[] }) {
  const theme = useTheme();

  const segments = useMemo(() => {
    if (!Array.isArray(stages) || !stages.length) return [];
    // use only stages with start/end
    const filtered = stages
      .map((s) => {
        if (!s.start || !s.end) return null;
        const start = new Date(s.start);
        const end = new Date(s.end);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
        return { start, end, stage: s.stage ?? 'unknown' };
      })
      .filter((s): s is { start: Date; end: Date; stage: string } => !!s);
    if (!filtered.length) return [];
    const minStart = Math.min(...filtered.map((s) => s.start.getTime()));
    const maxEnd = Math.max(...filtered.map((s) => s.end.getTime()));
    const span = Math.max(1, maxEnd - minStart);
    return filtered.map((s) => {
      const widthPct = ((s.end.getTime() - s.start.getTime()) / span) * 100;
      const leftPct = ((s.start.getTime() - minStart) / span) * 100;
      return {
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        color: STAGE_COLORS[s.stage] ?? theme.colors.primary,
      };
    });
  }, [stages, theme.colors.primary]);

  if (!segments.length) {
    return null;
  }

  return (
    <View
      style={{
        height: 10,
        borderRadius: 6,
        backgroundColor: theme.colors.surfaceVariant,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {segments.map((seg, idx) => (
        <View
          key={`${seg.left}-${idx}`}
          style={{
            position: 'absolute',
            left: seg.left,
            width: seg.width,
            top: 0,
            bottom: 0,
            backgroundColor: seg.color,
          }}
        />
      ))}
    </View>
  );
}


