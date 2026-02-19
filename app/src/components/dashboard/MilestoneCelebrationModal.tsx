/**
 * MilestoneCelebrationModal
 *
 * Full-screen overlay shown when a new streak badge is earned.
 * Uses Skia for confetti particles and Reanimated for entrance/exit.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { StreakBadge } from '@/lib/streaks';

// ─── Particle ────────────────────────────────────────────────────────────────

type Particle = {
  x: number;
  y: number;
  radius: number;
  color: string;
  /** Starting vertical velocity factor */
  vy: number;
  /** Horizontal drift */
  vx: number;
  /** Initial delay ms */
  delay: number;
  /** Duration ms */
  duration: number;
};

const PALETTE = [
  '#6C63FF', // violet
  '#FF6584', // rose
  '#43E97B', // emerald
  '#F7B731', // amber
  '#4FC3F7', // sky
  '#FF8A65', // coral
  '#CE93D8', // lavender
];

function generateParticles(count: number, width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  // Deterministic pseudo-random using LCG
  let seed = 0xdeadbeef;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  for (let i = 0; i < count; i++) {
    particles.push({
      x: rand() * width,
      y: -rand() * height * 0.5, // start above viewport
      radius: 3 + rand() * 5,
      color: PALETTE[Math.floor(rand() * PALETTE.length)],
      vy: 0.5 + rand() * 0.5,
      vx: (rand() - 0.5) * 0.3,
      delay: rand() * 600,
      duration: 1800 + rand() * 1200,
    });
  }
  return particles;
}

// ─── ConfettiCanvas ──────────────────────────────────────────────────────────

type ConfettiCanvasProps = {
  width: number;
  height: number;
  progress: Animated.SharedValue<number>;
};

function ConfettiCanvas({ width, height, progress }: ConfettiCanvasProps) {
  const particles = useMemo(() => generateParticles(60, width, height), [width, height]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => {
        // Each particle position is derived from shared progress
        const cx = useDerivedValue(() => p.x + p.vx * progress.value * height);
        const cy = useDerivedValue(() => p.y + p.vy * progress.value * height);
        const opacity = useDerivedValue(() => {
          const t = progress.value;
          return t < 0.1 ? t / 0.1 : t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
        });

        return (
          <Group key={i} opacity={opacity}>
            <Circle cx={cx} cy={cy} r={p.radius} color={p.color} />
          </Group>
        );
      })}
    </Canvas>
  );
}

// ─── MilestoneCelebrationModal ────────────────────────────────────────────────

export type MilestoneCelebrationProps = {
  visible: boolean;
  badge: StreakBadge | null;
  streakCount: number;
  shieldUsed?: boolean;
  onDismiss: () => void;
};

export function MilestoneCelebrationModal({
  visible,
  badge,
  streakCount,
  shieldUsed = false,
  onDismiss,
}: MilestoneCelebrationProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  const confettiProgress = useSharedValue(0);
  const orbScale = useSharedValue(0);

  const startAnimations = useCallback(() => {
    confettiProgress.value = 0;
    orbScale.value = 0;
    confettiProgress.value = withTiming(1, { duration: 3000, easing: Easing.out(Easing.cubic) });
    orbScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 120 }));
  }, [confettiProgress, orbScale]);

  useEffect(() => {
    if (visible) startAnimations();
  }, [visible, startAnimations]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  if (!badge) return null;

  const badgeIconMap: Record<string, string> = {
    mood_spark: 'lightning-bolt',
    mood_wave: 'wave',
    mood_compass: 'compass',
    mood_pioneer: 'flag',
    med_anchor: 'anchor',
    med_pulse: 'pulse',
    med_guardian: 'shield-check',
    med_resolver: 'check-decagram',
    mindful_breeze: 'leaf',
    mindful_flow: 'water',
    mindful_harmony: 'yin-yang',
    mindful_master: 'star-circle',
    sleep_rest: 'moon-waning-crescent',
    sleep_tide: 'waves',
    sleep_anchor: 'anchor',
    sleep_harmony: 'sleep',
  };

  const iconName =
    (badgeIconMap[badge.id] as any) ?? 'trophy';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(400)}
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.82)' }]}
      >
        {/* Confetti */}
        <ConfettiCanvas width={width} height={height} progress={confettiProgress} />

        {/* Content card */}
        <Animated.View
          entering={SlideInDown.duration(500).springify().damping(16)}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: 28,
              width: Math.min(width - 48, 360),
            },
          ]}
        >
          {/* Orb */}
          <Animated.View style={[styles.orbWrap, orbStyle]}>
            <View
              style={[
                styles.orb,
                {
                  backgroundColor: theme.colors.primaryContainer,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={iconName}
                size={40}
                color={theme.colors.primary}
              />
            </View>
          </Animated.View>

          <Text
            variant="headlineSmall"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {badge.title}
          </Text>

          <Text
            variant="bodyMedium"
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          >
            {badge.description}
          </Text>

          <Text
            variant="displaySmall"
            style={[styles.streak, { color: theme.colors.primary }]}
          >
            {streakCount}
          </Text>
          <Text
            variant="labelMedium"
            style={[styles.streakLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            day streak
          </Text>

          {shieldUsed && (
            <View style={styles.shieldRow}>
              <MaterialCommunityIcons
                name="shield-check"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.primary, marginLeft: 4 }}
              >
                Reclaim Shield protected your streak
              </Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={onDismiss}
            style={{ marginTop: 20, borderRadius: 12 }}
            accessibilityLabel="Dismiss milestone celebration"
          >
            Keep going
          </Button>
        </Animated.View>

        {/* Tap anywhere to dismiss */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 28,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  orbWrap: {
    marginBottom: 20,
  },
  orb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.8,
  },
  streak: {
    fontWeight: '900',
    lineHeight: 56,
  },
  streakLabel: {
    opacity: 0.6,
    marginTop: -4,
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    opacity: 0.9,
  },
});
