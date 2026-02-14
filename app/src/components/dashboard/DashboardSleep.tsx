import React from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import type { SleepSession } from '@/lib/health/types';

export type DashboardSleepProps = {
  sleep: SleepSession;
  onNavigateToSleep: () => void;
};

function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const hex = color.replace('#', '').trim();
  const full = hex.length === 3 ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}` : hex.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return color;
  return `rgba(${r},${g},${b},${a})`;
}

const STAGE_COLORS: Record<string, string> = {
  awake: '#f4b400',
  light: '#64b5f6',
  deep: '#1e88e5',
  rem: '#ab47bc',
};

function stageLevel(stage: string): number {
  switch (stage) {
    case 'awake':
      return 0;
    case 'light':
      return 1;
    case 'rem':
      return 1.5;
    case 'deep':
      return 2;
    default:
      return 1;
  }
}

export function DashboardSleep({ sleep, onNavigateToSleep }: DashboardSleepProps) {
  const theme = useTheme();
  const s = sleep;
  const start = s.startTime ? new Date(s.startTime) : null;
  const end = s.endTime ? new Date(s.endTime) : null;
  const durationHours = s.durationMinutes ? (s.durationMinutes / 60).toFixed(1) : null;
  const efficiency = s.efficiency ? Math.round(s.efficiency * 100) : null;

  let hypnogramSegments: Array<{ start: string; end: string; stage: string }> | null = null;
  if (s.stages && Array.isArray(s.stages)) {
    const segments = s.stages
      .map((seg: { start?: Date | string; end?: Date | string; stage?: string }) => {
        const st = seg.start ? new Date(seg.start) : null;
        const en = seg.end ? new Date(seg.end) : null;
        if (!st || !en || en.getTime() <= st.getTime()) return null;
        return {
          start: st.toISOString(),
          end: en.toISOString(),
          stage: seg.stage ?? 'unknown',
        };
      })
      .filter((seg): seg is { start: string; end: string; stage: string } => seg !== null);
    hypnogramSegments = segments.length ? segments : null;
  }

  if (!start || !end) {
    return (
      <InformationalCard>
        <FeatureCardHeader icon="sleep" title="Sleep" subtitle="Your latest session." />
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Sleep data unavailable</Text>
        </View>
      </InformationalCard>
    );
  }

  const now = new Date();
  const isLastNight =
    end.getTime() >= now.getTime() - 24 * 60 * 60 * 1000 && end.getTime() < now.getTime();
  const timeLabel = isLastNight
    ? 'Last night'
    : `Most recent • ${end.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;

  const total = end.getTime() - start.getTime();

  return (
    <InformationalCard>
      <FeatureCardHeader icon="sleep" title="Sleep" subtitle="Your latest session." />
      <View style={{ marginTop: 10 }}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
          {timeLabel}
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 8 }}>
          {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} →{' '}
          {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </Text>
        {durationHours || efficiency ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            {durationHours ? `${durationHours} hours` : ''}
            {durationHours && efficiency ? ' • ' : ''}
            {efficiency ? `Efficiency: ${efficiency}%` : ''}
          </Text>
        ) : null}
        {hypnogramSegments ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ opacity: 0.8, marginBottom: 6, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
              Hypnogram
            </Text>
            <View
              style={{
                height: 50,
                backgroundColor: theme.colors.surface,
                borderRadius: 10,
                overflow: 'hidden',
                position: 'relative',
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
              }}
            >
              {hypnogramSegments.map((seg, i) => {
                const segStart = new Date(seg.start);
                const segEnd = new Date(seg.end);
                const segLen = segEnd.getTime() - segStart.getTime();
                const w = Math.max(2, Math.round((segLen / total) * 300));
                const leftPct = ((segStart.getTime() - start.getTime()) / total) * 100;
                const y = stageLevel(seg.stage);
                const isLast = i === hypnogramSegments!.length - 1;
                const color = STAGE_COLORS[seg.stage] ?? theme.colors.secondary;
                return (
                  <View
                    key={`sleep-segment-${i}-${seg.stage}`}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      bottom: y * 12,
                      width: w,
                      height: 6,
                      borderRadius: 6,
                      backgroundColor: withAlpha(color, 0.72),
                      opacity: seg.stage === 'awake' ? 0.32 : 1,
                      borderRightWidth: isLast ? 0 : 1,
                      borderRightColor: 'rgba(255,255,255,0.10)',
                    }}
                  />
                );
              })}
            </View>
          </View>
        ) : null}
        <View style={{ marginTop: 12 }}>
          <Button mode="outlined" compact onPress={onNavigateToSleep}>
            View sleep details
          </Button>
        </View>
      </View>
    </InformationalCard>
  );
}
