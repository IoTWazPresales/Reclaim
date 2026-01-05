// Rest Timer Component - Persistent timer banner while resting
import React, { useState, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';

interface RestTimerProps {
  restSeconds: number;
  onRestComplete: () => void;
  onExtend: (seconds: number) => void;
  onSkip: () => void;
}

export default function RestTimer({ restSeconds, onRestComplete, onExtend, onSkip }: RestTimerProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [remaining, setRemaining] = useState(restSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Reset timer when restSeconds changes
    setRemaining(restSeconds);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newRemaining = Math.max(0, restSeconds - elapsed);
      setRemaining(newRemaining);

      if (newRemaining === 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        onRestComplete();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [restSeconds, onRestComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExtend = (seconds: number) => {
    const newTotal = restSeconds + seconds;
    setRemaining(newTotal);
    startTimeRef.current = Date.now();
    onExtend(seconds);
  };

  return (
    <Card
      mode="elevated"
      style={{
        marginBottom: appTheme.spacing.lg,
        backgroundColor: theme.colors.primaryContainer,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
        borderRadius: appTheme.borderRadius.xl,
      }}
    >
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onPrimaryContainer }}>
              Rest Timer
            </Text>
            <Text variant="headlineSmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: appTheme.spacing.xs }}>
              {formatTime(remaining)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: appTheme.spacing.sm }}>
            <Button mode="text" compact onPress={() => handleExtend(30)}>
              +30s
            </Button>
            <Button mode="text" compact onPress={() => handleExtend(60)}>
              +60s
            </Button>
            <Button mode="text" compact onPress={onSkip}>
              Skip
            </Button>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}
