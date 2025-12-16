import React from 'react';
import { View, Text } from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import { SleepDurationSparkline } from './SleepDurationSparkline';
import { SleepStagesBar, StageSegment } from './SleepStagesBar';
import { MiniStageTimeline } from './components/MiniStageTimeline';
import { TimelineWithLabels } from './components/TimelineWithLabels';
import { Portal, Modal, Button as PaperButton } from 'react-native-paper';

export type LegacySleepSession = {
  startTime: string;
  endTime: string;
  durationMin: number;
  efficiency?: number | null;
  stages?: StageSegment[] | null;
  metadata?: Record<string, any>;
  source?: string;
};

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

  const history = filtered.slice(0, 10);
  const sparklineDurations = history
    .map((s) => s.durationMin)
    .filter((v) => typeof v === 'number' && isFinite(v));

  const cardRadius = 16;
  const cardSurface = theme.colors.surface;

  return (
    <View>
      <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: 12 }}>
        <Card.Content>
          <SleepDurationSparkline durations={sparklineDurations} />
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
        <Modal
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
                <TimelineWithLabels
                  stages={selected.stages as StageSegment[]}
                  startLabel={new Date(selected.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  endLabel={new Date(selected.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
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
        </Modal>
      </Portal>
    </View>
  );
}


