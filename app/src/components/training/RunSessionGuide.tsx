import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { healthConnectGetHeartRateForSessionWindow } from '@/lib/health/healthConnectService';
import { logger } from '@/lib/logger';
import { runPhaseCue } from '@/lib/training/runGuidance';

type Phase = 'ready' | 'running' | 'walking' | 'paused';

type Props = {
  targetMinutes: number;
  startedAt: string | null;
  isEnded: boolean;
};

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function RunSessionGuide({ targetMinutes, startedAt, isEnded }: Props) {
  const theme = useTheme();
  const [phase, setPhase] = useState<Phase>('ready');
  const [elapsed, setElapsed] = useState(0);
  const [bpm, setBpm] = useState<number | null>(null);
  const [hrKnown, setHrKnown] = useState(false);

  useEffect(() => {
    if (phase === 'ready' || phase === 'paused' || isEnded) return;
    const id = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [phase, isEnded]);

  useEffect(() => {
    if (!startedAt || isEnded) return;
    let cancelled = false;
    const read = () => {
      const end = new Date();
      const start = new Date(end.getTime() - 2 * 60 * 1000);
      void healthConnectGetHeartRateForSessionWindow(start.toISOString(), end.toISOString())
        .then((result) => {
          if (cancelled) return;
          setHrKnown(true);
          setBpm(result.avgHeartRateBpm);
        })
        .catch((error) => {
          if (__DEV__) logger.debug('[RUN] heart rate read failed', error);
        });
    };
    read();
    const id = setInterval(read, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [startedAt, isEnded]);

  const remaining = Math.max(0, targetMinutes * 60 - elapsed);
  const heart =
    bpm != null ? `${Math.round(bpm)} bpm` : hrKnown ? 'No heart rate from Health Connect yet' : 'Reading heart rate';

  return (
    <View style={{ marginTop: 12 }}>
      <Text variant="headlineMedium" style={{ fontVariant: ['tabular-nums'], color: theme.colors.onSurface }}>
        {formatClock(elapsed)}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
        {targetMinutes} min session · {formatClock(remaining)} left
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 8 }}>
        {runPhaseCue(isEnded ? 'paused' : phase)}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 8 }} accessibilityLabel={`Heart rate ${heart}`}>
        Heart rate · {heart}
      </Text>
      {!isEnded && phase === 'ready' ? (
        <Button mode="contained" style={{ marginTop: 12 }} onPress={() => setPhase('running')} accessibilityLabel="Start run">
          Start
        </Button>
      ) : null}
      {!isEnded && (phase === 'running' || phase === 'walking') ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Button mode="outlined" onPress={() => setPhase('paused')} accessibilityLabel="Pause run">
            Pause
          </Button>
          {phase === 'running' ? (
            <Button mode="contained" onPress={() => setPhase('walking')} accessibilityLabel="Switch to a walk">
              Walk
            </Button>
          ) : (
            <Button mode="contained" onPress={() => setPhase('running')} accessibilityLabel="Start running again">
              Run
            </Button>
          )}
        </View>
      ) : null}
      {!isEnded && phase === 'paused' ? (
        <Button
          mode="contained"
          style={{ marginTop: 12 }}
          onPress={() => setPhase('running')}
          accessibilityLabel="Resume run"
        >
          Resume
        </Button>
      ) : null}
    </View>
  );
}
