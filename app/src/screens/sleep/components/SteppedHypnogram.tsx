import React from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { StageSegment } from '../SleepStagesBar';

type Props = {
  stages?: StageSegment[] | null;
  startTime?: string | Date;
  endTime?: string | Date;
  height?: number; // overall band height
  showTitle?: boolean;
};

type LegacyStage = 'awake' | 'light' | 'deep' | 'rem' | 'unknown';

function normalizeISO(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return String(value);
}

function toTimelineSegments(
  stages: StageSegment[] | null | undefined,
  startTime?: string | Date,
  endTime?: string | Date,
): Array<{ start: string; end: string; stage: LegacyStage }> | null {
  if (!Array.isArray(stages) || !stages.length) return null;

  // Case A: already a timeline
  const hasStartEnd = stages.some((s: any) => s?.start && s?.end);
  if (hasStartEnd) {
    return stages
      .map((s: any) => ({
        start: normalizeISO(s.start),
        end: normalizeISO(s.end),
        stage: (s.stage as LegacyStage) ?? 'unknown',
      }))
      .filter((s) => s.start && s.end) as any;
  }

  // Case B: totals only -> synthesize a timeline (same idea as heroStagesForHypnogram)
  const totals = stages.filter((s: any) => typeof s?.minutes === 'number' || typeof s?.durationMinutes === 'number');
  if (!totals.length) return null;

  const end = endTime ? new Date(endTime) : null;
  let start = startTime ? new Date(startTime) : null;

  const totalMinutes =
    totals.reduce((acc: number, seg: any) => acc + (typeof seg.minutes === 'number' ? seg.minutes : seg.durationMinutes || 0), 0) || 0;

  if (!start && end && totalMinutes) start = new Date(end.getTime() - totalMinutes * 60000);
  if (!start || !end) return null;

  let cursor = new Date(start);
  return totals.map((seg: any) => {
    const mins = typeof seg.minutes === 'number' ? seg.minutes : seg.durationMinutes || 0;
    const segStart = new Date(cursor);
    const segEnd = new Date(cursor.getTime() + mins * 60000);
    cursor = new Date(segEnd);
    return {
      start: segStart.toISOString(),
      end: segEnd.toISOString(),
      stage: (seg.stage as LegacyStage) ?? 'unknown',
    };
  });
}

export function SteppedHypnogram({ stages, startTime, endTime, height = 56, showTitle = true }: Props) {
  const theme = useTheme();
  const [w, setW] = React.useState<number>(0);

  const segments = React.useMemo(
    () => toTimelineSegments(stages as any, startTime, endTime),
    [stages, startTime, endTime],
  );

  const STAGE_COLORS: Record<LegacyStage, string> = {
    awake: '#f4b400',
    light: '#64b5f6',
    deep: '#1e88e5',
    rem: '#ab47bc',
    unknown: theme.colors.secondary,
  };

  const stageLevel = (s: LegacyStage) => {
    // higher = more awake (visual “up”), lower = deeper
    switch (s) {
      case 'awake': return 0;
      case 'light': return 1;
      case 'rem':   return 1.5;
      case 'deep':  return 2;
      default:      return 1;
    }
  };

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (!segments || !segments.length) {
    return (
      <View style={{ marginTop: 12 }}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>No stage timeline</Text>
      </View>
    );
  }

  const startMs = +new Date(segments[0].start);
  const endMs = +new Date(segments[segments.length - 1].end);
  const total = Math.max(1, endMs - startMs);

  return (
    <View style={{ marginTop: 12 }}>
      {showTitle ? (
        <Text style={{ opacity: 0.8, marginBottom: 6, color: theme.colors.onSurfaceVariant }}>
          Hypnogram
        </Text>
      ) : null}

      <View
        onLayout={onLayout}
        style={{
          height,
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        {segments.map((seg, i) => {
          const segStart = +new Date(seg.start);
          const segEnd = +new Date(seg.end);
          const leftPct = ((segStart - startMs) / total) * 100;
          const widthPct = Math.max(0.5, ((segEnd - segStart) / total) * 100); // tiny min width
          const y = stageLevel(seg.stage);

          // Convert “level” into a bottom offset (deep lower)
          const bottom = y * (height / 4.2);
          const barH = 7;

          return (
            <View
              key={`hyp-${i}-${seg.stage}`}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                bottom,
                height: barH,
                borderRadius: 6,
                backgroundColor: STAGE_COLORS[seg.stage] ?? theme.colors.secondary,
                opacity: seg.stage === 'awake' ? 0.28 : 0.72,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
