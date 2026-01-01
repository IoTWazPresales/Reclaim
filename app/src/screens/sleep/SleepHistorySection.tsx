import React from 'react';
import { View, Text } from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import { SleepDurationSparkline } from './SleepDurationSparkline';
import { SleepStagesBar, StageSegment } from './SleepStagesBar';
import { MiniStageTimeline } from './components/MiniStageTimeline';
import { TimelineWithLabels } from './components/TimelineWithLabels';
import { Portal, Button as PaperButton } from 'react-native-paper';
import * as RNPaper from 'react-native-paper';
import { HeroHypnogram } from './components/HeroHypnogram';
import { SteppedHypnogram } from './components/SteppedHypnogram';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';

// Use Modal via namespace to avoid TS named-export complaints
// @ts-ignore Modal exists at runtime on react-native-paper
const PaperModal = (RNPaper as any).Modal;
export type LegacySleepSession = {
  startTime: string;
  endTime: string;
  durationMin: number;
  efficiency?: number | null;
  stages?: StageSegment[] | null;
  metadata?: Record<string, any>;
  source?: string;
};

function MiniBarSparkline({
  data,
  maxValue,
  height = 36,
  barWidth = 8,
  gap = 2,
}: {
  data: number[];
  maxValue?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
}) {
  const theme = useTheme();
  const max = Math.max(1, maxValue ?? (data.length ? Math.max(...data) : 1));
  const scale = (v: number) => Math.max(1, Math.round((Math.min(v, max) / max) * height));

  return (
    <View style={{ marginTop: 6, overflow: 'hidden', width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
        {data.map((v, i) => (
          <View
            key={`sleep-bar-${i}`}
            style={{
              width: barWidth,
              height: scale(v),
              marginRight: i === data.length - 1 ? 0 : gap,
              borderRadius: 4,
              backgroundColor: theme.colors.primary,
              opacity: v === 0 ? 0.2 : 1,
            }}
          />
        ))}
      </View>
      <View 
      pointerEvents="none"
      style={{ height, position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: theme.colors.outlineVariant,
          }}
        />
      </View>
    </View>
  );
}
type Props = {
  sessions: LegacySleepSession[];
  excludeKey?: string | null; // key to skip (e.g., latest)
};

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatRange(startStr: string, endStr: string) {
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Time unavailable';
    return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} → ${end.toLocaleTimeString(
      [],
      { hour: 'numeric', minute: '2-digit' }
    )}`;
  } catch {
    return 'Time unavailable';
  }
}

export function SleepHistorySection({ sessions, excludeKey }: Props) {
  const theme = useTheme();
  const [selected, setSelected] = React.useState<LegacySleepSession | null>(null);
  const filtered = sessions.filter((s) => {
    const key = `${s.startTime}-${s.endTime}`;
    if (excludeKey && key === excludeKey) return false;
    return true;
  });

  
  const history = filtered.slice(0, 14);

  const durationHoursSeries = history
    .map((s) => {
      const h = Math.max(0, Math.min(12, (s.durationMin ?? 0) / 60)); // clamp 0..12h
      return Number.isFinite(h) ? h : 0;
    })
    .reverse(); // oldest → newest (so the trend flows right)
    const avg7 =
    durationHoursSeries.length
      ? (
          durationHoursSeries.slice(-7).reduce((sum, v) => sum + v, 0) /
          Math.max(1, durationHoursSeries.slice(-7).length)
        ).toFixed(1)
      : null;

  const sparklineDurations = history
    .map((s) => s.durationMin)
    .filter((v) => typeof v === 'number' && isFinite(v));

  const cardRadius = 16;
  const cardSurface = theme.colors.surface;
  
  return (
    <View>
      <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: 12 }}>
  <Card.Content>
    <FeatureCardHeader icon="history" title="History" subtitle="Last 14 days" />
    <MiniBarSparkline data={durationHoursSeries} maxValue={12} height={72} barWidth={12} gap={4} />
    <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
      7-day average: {avg7 ? `${avg7}h` : '—'}
    </Text>
  </Card.Content>
</Card>
      {history.map((s) => {
        const key = `${s.startTime}-${s.endTime}`;
        return (
          <Card
            key={key}
            mode="elevated"
            style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: 12 }}
            onPress={() => setSelected(s)}
          >
            <Card.Content>
              <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                {formatDateLabel(s.endTime)}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {formatRange(s.startTime, s.endTime)}
              </Text>
              <Text style={{ color: theme.colors.onSurface, marginTop: 4, fontWeight: '600' }}>
                {Math.round(s.durationMin)} min
              </Text>
              {s.source ? (
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>Source: {s.source}</Text>
              ) : null}
              <View style={{ marginTop: 8 }}>
                {Array.isArray(s.stages) && s.stages.some((seg) => seg.start && seg.end) ? (
                  <MiniStageTimeline stages={s.stages as StageSegment[]} />
                ) : (
                  <SleepStagesBar stages={s.stages ?? undefined} compact />
                )}
              </View>
            </Card.Content>
          </Card>
        );
      })}
      {!history.length ? (
        <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
          <Card.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>No history yet.</Text>
          </Card.Content>
        </Card>
      ) : null}

      <Portal>
        <PaperModal
          visible={!!selected}
          onDismiss={() => setSelected(null)}
          contentContainerStyle={{
            margin: 16,
            padding: 16,
            borderRadius: 16,
            backgroundColor: theme.colors.surface,
          }}
        >
          {selected ? (
            <View>
              <Text style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 4 }}>
                {formatDateLabel(selected.endTime)}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                {formatRange(selected.startTime, selected.endTime)}
              </Text>
              {Array.isArray(selected.stages) && selected.stages.some((seg) => seg.start && seg.end) ? (
                <SteppedHypnogram
                stages={selected.stages as any}
                startTime={selected.startTime}
                endTime={selected.endTime}
                height={72}
                showTitle={false}
              />
            ) : (
              <SleepStagesBar stages={selected.stages ?? undefined} />
            )}
              <View style={{ marginTop: 12, gap: 4 }}>
                <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  Duration: {Math.round(selected.durationMin)} min
                </Text>
                {selected.source ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Source: {selected.source}</Text>
                ) : null}
                {typeof (selected as any).efficiency === 'number' ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Efficiency: {Math.round(((selected as any).efficiency ?? 0) * 100)}%
                  </Text>
                ) : null}
                {typeof (selected as any).quality === 'number' ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Score: {Math.round((selected as any).quality)}
                  </Text>
                ) : null}
                {selected.metadata?.note ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Note: {selected.metadata.note}</Text>
                ) : null}
              </View>
              <PaperButton
                mode="contained-tonal"
                style={{ marginTop: 12, alignSelf: 'flex-start' }}
                onPress={() => setSelected(null)}
              >
                Close
              </PaperButton>
            </View>
          ) : null}
        </PaperModal>
      </Portal>
    </View>
  );
}


