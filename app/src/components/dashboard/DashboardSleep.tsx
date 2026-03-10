import React from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import type { SleepSession } from '@/lib/health/types';

export type DashboardSleepProps = {
  sleep: SleepSession | null;
  onNavigateToSleep: () => void;
  isLoading?: boolean;
  hasConnectedProvider?: boolean;
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

export function DashboardSleep({
  sleep,
  onNavigateToSleep,
  isLoading = false,
  hasConnectedProvider = false,
}: DashboardSleepProps) {
  const theme = useTheme();

  if (!sleep) {
    const emptyMessage = isLoading
      ? 'Loading sleep data…'
      : hasConnectedProvider
        ? 'No recent sleep session found yet. Sync your provider data or check Sleep details.'
        : 'Connect a health provider to see your sleep sessions, duration, and stage data here.';
    const ctaLabel = hasConnectedProvider ? 'View sleep details' : 'Set up sleep tracking';
    return (
      <InformationalCard feedbackScope={{ componentKey: 'dashboard-sleep-empty', componentTitle: 'Sleep', tags: ['dashboard', 'sleep'] }}>
        <FeatureCardHeader icon="sleep" title="Sleep" subtitle="Your latest session." />
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            {emptyMessage}
          </Text>
          <Button mode="contained-tonal" compact onPress={onNavigateToSleep} disabled={isLoading}>
            {ctaLabel}
          </Button>
        </View>
      </InformationalCard>
    );
  }

  const s = sleep;
  const start = s.startTime ? new Date(s.startTime) : null;
  const end = s.endTime ? new Date(s.endTime) : null;
  const durationHours = s.durationMinutes ? (s.durationMinutes / 60).toFixed(1) : null;
  const efficiency = s.efficiency ? Math.round(s.efficiency * 100) : null;

  let hypnogramSegments: Array<{ start: string; end: string; stage: string }> | null = null;
  const sessionStartMs = start?.getTime() ?? NaN;
  const sessionEndMs = end?.getTime() ?? NaN;
  if (s.stages && Array.isArray(s.stages)) {
    const segments = s.stages
      .map((seg: { start?: Date | string; end?: Date | string; stage?: string }) => {
        const st = seg.start ? new Date(seg.start) : null;
        const en = seg.end ? new Date(seg.end) : null;
        if (!st || !en || en.getTime() <= st.getTime()) return null;
        // Normalize segments to the selected session window to avoid misleading timelines.
        const clippedStartMs = Number.isFinite(sessionStartMs) ? Math.max(st.getTime(), sessionStartMs) : st.getTime();
        const clippedEndMs = Number.isFinite(sessionEndMs) ? Math.min(en.getTime(), sessionEndMs) : en.getTime();
        if (!Number.isFinite(clippedStartMs) || !Number.isFinite(clippedEndMs) || clippedEndMs <= clippedStartMs) return null;
        return {
          start: new Date(clippedStartMs).toISOString(),
          end: new Date(clippedEndMs).toISOString(),
          stage: seg.stage ?? 'unknown',
        };
      })
      .filter((seg): seg is { start: string; end: string; stage: string } => seg !== null);
    hypnogramSegments = segments.length ? segments : null;
  }

  if (!start || !end) {
    return (
      <InformationalCard feedbackScope={{ componentKey: 'dashboard-sleep', componentTitle: 'Sleep', tags: ['dashboard', 'sleep'] }}>
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
  const hypnogramCoverage = hypnogramSegments
    ? hypnogramSegments.reduce((sum, seg) => {
        const segStart = new Date(seg.start).getTime();
        const segEnd = new Date(seg.end).getTime();
        if (!Number.isFinite(segStart) || !Number.isFinite(segEnd) || segEnd <= segStart) return sum;
        return sum + (segEnd - segStart);
      }, 0) / Math.max(1, total)
    : 0;
  const showHypnogram = !!hypnogramSegments && hypnogramCoverage >= 0.6;
  const hypnogramRenderableSegments = hypnogramSegments ?? [];

  return (
    <InformationalCard feedbackScope={{ componentKey: 'dashboard-sleep', componentTitle: 'Sleep', tags: ['dashboard', 'sleep'] }}>
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
        {showHypnogram ? (
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
              {hypnogramRenderableSegments.map((seg, i) => {
                const segStart = new Date(seg.start);
                const segEnd = new Date(seg.end);
                const segLen = segEnd.getTime() - segStart.getTime();
                const wPct = Math.max(0.5, (segLen / total) * 100);
                const leftPct = ((segStart.getTime() - start.getTime()) / total) * 100;
                const y = stageLevel(seg.stage);
                const isLast = i === hypnogramRenderableSegments.length - 1;
                const color = STAGE_COLORS[seg.stage] ?? theme.colors.secondary;
                return (
                  <View
                    key={`sleep-segment-${i}-${seg.stage}`}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      bottom: y * 12,
                      width: `${wPct}%`,
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
        ) : hypnogramSegments ? (
          <Text variant="bodySmall" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Stage data is partial for this session, so hypnogram is hidden.
          </Text>
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
