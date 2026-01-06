// Rest Timer - Persistent timer between sets
import React, { useState, useEffect, useRef } from 'react';
import { View, AppState, AppStateStatus } from 'react-native';
import { Card, Text, Button, useTheme, ProgressBar } from 'react-native-paper';
import { useAppTheme } from '@/theme';

interface RestTimerProps {
  targetSeconds: number;
  onComplete: () => void;
  onExtend: (seconds: number) => void;
  onSkip: () => void;
}

export default function RestTimer({ targetSeconds, onComplete, onExtend, onSkip }: RestTimerProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [remaining, setRemaining] = useState(targetSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedRef = useRef<number>(0);
  const appState = useRef(AppState.currentState);

  // Initialize timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    elapsedRef.current = 0;
  }, [targetSeconds]);

  // Main timer logic - runs every 100ms for smooth updates
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const totalElapsed = Math.floor((now - startTimeRef.current + elapsedRef.current) / 1000);
      const newRemaining = Math.max(0, targetSeconds - totalElapsed);

      setRemaining(newRemaining);

      if (newRemaining === 0) {
        onComplete();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, targetSeconds, onComplete]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground - timer continues from where it left off
        // No action needed, timer will recalculate based on startTimeRef
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - save elapsed time
        const now = Date.now();
        elapsedRef.current += (now - startTimeRef.current);
        startTimeRef.current = now;
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleExtend = (seconds: number) => {
    // Extend by adding to target and resetting start time
    const now = Date.now();
    const totalElapsed = Math.floor((now - startTimeRef.current + elapsedRef.current) / 1000);
    startTimeRef.current = now;
    elapsedRef.current = 0;
    onExtend(seconds);
    setRemaining(targetSeconds + seconds - totalElapsed);
  };

  const progress = 1 - (remaining / targetSeconds);

  return (
    <Card
      mode="elevated"
      style={{
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: appTheme.borderRadius.xl,
        marginBottom: appTheme.spacing.lg,
      }}
    >
      <Card.Content>
        <View style={{ alignItems: 'center' }}>
          <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.onSecondaryContainer, marginBottom: appTheme.spacing.sm }}>
            Rest: {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
          </Text>
          <ProgressBar
            progress={progress}
            color={theme.colors.primary}
            style={{ width: '100%', height: 8, borderRadius: 4, marginBottom: appTheme.spacing.md }}
          />
          <View style={{ flexDirection: 'row', gap: appTheme.spacing.sm }}>
            <Button mode="outlined" compact onPress={() => handleExtend(30)}>
              +30s
            </Button>
            <Button mode="outlined" compact onPress={() => handleExtend(60)}>
              +60s
            </Button>
            <Button mode="contained" compact onPress={onSkip}>
              Skip Rest
            </Button>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}
