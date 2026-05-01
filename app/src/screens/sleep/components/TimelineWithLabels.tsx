import React, { useMemo } from 'react';
import { View, Text, type DimensionValue } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { StageSegment } from '../SleepStagesBar';

type Props = {
  stages: StageSegment[];
  startLabel?: string;
  endLabel?: string;
  height?: number;
};

const STAGE_COLORS: Record<string, string> = {
  awake: '#f4b400',
  light: '#64b5f6',
  deep: '#1e88e5',
  rem: '#ab47bc',
  unknown: '#b0bec5',
};

export function TimelineWithLabels({ stages, startLabel, endLabel, height = 12 }: Props) {
  const theme = useTheme();

  const segments = useMemo(() => {
    if (!Array.isArray(stages) || !stages.length) return [];
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

  return (
    <View>
      <View
        style={{
          height,
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
              left: seg.left as DimensionValue,
              width: seg.width as DimensionValue,
              top: 0,
              bottom: 0,
              backgroundColor: seg.color,
            }}
          />
        ))}
      </View>
      {(startLabel || endLabel) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>{startLabel ?? ''}</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>{endLabel ?? ''}</Text>
        </View>
      )}
    </View>
  );
}


