import React from 'react';
import { View, Text } from 'react-native';
import { Card, Button, useTheme } from 'react-native-paper';
import { SleepDurationSparkline } from './SleepDurationSparkline';
import { SleepStagesBar, StageSegment } from './SleepStagesBar';

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
  onSeeAll?: () => void;
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

export function SleepHistorySection({ sessions, excludeKey, onSeeAll }: Props) {
  const theme = useTheme();
  const filtered = sessions.filter((s) => {
    const key = `${s.startTime}-${s.endTime}`;
    if (excludeKey && key === excludeKey) return false;
    return true;
  });

  const history = filtered.slice(0, 10);
  const sparklineDurations = history
    .map((s) => s.durationMin)
    .filter((v) => typeof v === 'number' && isFinite(v));

  return (
    <View style={{ marginBottom: 16 }}>
      <Card mode="elevated" style={{ borderRadius: 16, backgroundColor: theme.colors.surface, marginBottom: 12 }}>
        <Card.Title
          title="History"
          right={() => (
            <Button mode="text" onPress={onSeeAll} disabled={!onSeeAll} compact>
              See all
            </Button>
          )}
        />
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
            style={{ borderRadius: 16, backgroundColor: theme.colors.surface, marginBottom: 12 }}
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
                <SleepStagesBar stages={s.stages ?? undefined} compact />
              </View>
            </Card.Content>
          </Card>
        );
      })}
      {!history.length ? (
        <Card mode="elevated" style={{ borderRadius: 16, backgroundColor: theme.colors.surface }}>
          <Card.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>No history yet.</Text>
          </Card.Content>
        </Card>
      ) : null}
    </View>
  );
}


