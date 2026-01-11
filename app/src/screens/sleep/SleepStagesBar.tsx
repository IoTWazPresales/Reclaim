import React from 'react';
import { View, Text, StyleSheet, type DimensionValue } from 'react-native';
import { useTheme } from 'react-native-paper';

export type StageSegment = {
  start?: Date | string;
  end?: Date | string;
  stage?: string;
  minutes?: number;
};

type SleepStagesBarProps = {
  stages?: StageSegment[] | StageSegment | Record<string, any> | null;
  compact?: boolean;
  variant?: 'default' | 'hero';
};

const STAGE_COLORS: Record<string, string> = {
  awake: '#f4b400',
  light: '#64b5f6',
  deep: '#1e88e5',
  rem: '#ab47bc',
  unknown: '#b0bec5',
};

function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const hex = color.replace('#', '').trim();
  const full =
    hex.length === 3
      ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
      : hex.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return color;
  return `rgba(${r},${g},${b},${a})`;
}

function toArrayStages(stages?: StageSegment[] | StageSegment | Record<string, any> | null) {
  if (!stages) return [];
  if (Array.isArray(stages)) return stages;
  if (typeof stages === 'object') {
    return Object.values(stages) as StageSegment[];
  }
  return [];
}

function durationMinutes(seg: StageSegment): number {
  if (typeof seg.minutes === 'number') return Math.max(0, seg.minutes);
  if (typeof (seg as any)?.durationMinutes === 'number') return Math.max(0, (seg as any).durationMinutes);
  if (seg.start && seg.end) {
    const start = new Date(seg.start);
    const end = new Date(seg.end);
    const diff = (end.getTime() - start.getTime()) / 60000;
    return Math.max(0, isFinite(diff) ? diff : 0);
  }
  return 0;
}

export function SleepStagesBar({ stages, compact, variant = 'default' }: SleepStagesBarProps) {
  const theme = useTheme();
  const arr = toArrayStages(stages);
  if (!arr.length) {
    return <Text style={{ color: theme.colors.onSurfaceVariant }}>No stage data</Text>;
  }

  const buckets: Record<string, number> = { awake: 0, light: 0, deep: 0, rem: 0, unknown: 0 };
  for (const seg of arr) {
    const key = (seg.stage || 'unknown').toLowerCase();
    buckets[key] = (buckets[key] ?? 0) + durationMinutes(seg);
  }

  const entries = Object.entries(buckets).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
  const isHero = variant === 'hero';
  const separatorColor = theme.colors.outlineVariant;

  return (
    <View>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: isHero ? withAlpha(theme.colors.onSurface, 0.10) : theme.colors.surfaceVariant,
          },
        ]}
      >
        {entries.map(([key, value], idx) => {
          const widthPct = `${(value / total) * 100}%`;
          return (
            <View
              key={key}
              style={{
                width: widthPct as DimensionValue,
                backgroundColor: isHero
                  ? withAlpha(STAGE_COLORS[key] ?? theme.colors.primary, 0.72)
                  : STAGE_COLORS[key] ?? theme.colors.primary,
                height: compact ? 8 : 12,
                borderRightWidth: idx === entries.length - 1 ? 0 : 1,
                borderRightColor: isHero ? separatorColor : 'transparent',
                borderRadius: isHero ? (compact ? 6 : 8) : 0,
              }}
            />
          );
        })}
      </View>
      {!compact ? (
        <View style={styles.legend}>
          {entries.map(([key, value]) => (
            <View key={`legend-${key}`} style={styles.legendItem}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: STAGE_COLORS[key] ?? theme.colors.primary,
                  marginRight: 6,
                }}
              />
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                {key.toUpperCase()} {Math.round(value)}m
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});


