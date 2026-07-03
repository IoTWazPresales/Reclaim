/**
 * MilestoneCelebrationModal
 *
 * Overlay shown for user-earned moments only: dose taken, session finished,
 * streak milestone, PR. Motion discipline: ONE spring (scale 0.96 → 1.06 → 1.0)
 * settled in under 450ms, one haptic. No loops, no confetti, no multi-bounce.
 * Reduced-motion renders statically.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { StreakBadge } from '@/lib/streaks';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { triggerLightHaptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme';
import { reclaimPrimaryCapsuleButton } from '@/theme/reclaimVisualLanguage';

export type MilestoneCelebrationProps = {
  visible: boolean;
  badge?: StreakBadge | null;
  streakCount?: number;
  shieldUsed?: boolean;
  hapticsEnabled?: boolean;
  onDismiss: () => void;
  /** Earned micro-moment (dose taken, session end) — without a streak badge. */
  micro?: {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    subtitle: string;
  };
};

export function MilestoneCelebrationModal({
  visible,
  badge = null,
  streakCount = 0,
  shieldUsed = false,
  hapticsEnabled = true,
  onDismiss,
  micro,
}: MilestoneCelebrationProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const cardScale = useSharedValue(1);

  // One spring: 0.96 → 1.06 → 1.0, settled in <= 450ms. One pass, no loops.
  const startAnimations = useCallback(() => {
    if (reduceMotion) {
      cardScale.value = 1;
      return;
    }
    cardScale.value = 0.96;
    cardScale.value = withSequence(
      withTiming(1.06, { duration: 160, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 22, stiffness: 420, overshootClamping: true }),
    );
  }, [cardScale, reduceMotion]);

  useEffect(() => {
    if (visible) {
      // One haptic per celebration.
      void triggerLightHaptic({ enabled: hapticsEnabled, reduceMotion, style: 'success' });
      startAnimations();
    }
  }, [visible, startAnimations, hapticsEnabled, reduceMotion]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  if (!badge && !micro) return null;

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

  const iconName = micro
    ? micro.icon
    : ((badgeIconMap[badge!.id] as any) ?? 'trophy');

  const titleText = micro ? micro.title : badge!.title;
  const descriptionText = micro ? micro.subtitle : badge!.description;
  const showStreak = !micro && streakCount > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(250)}
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.82)' }]}
      >
        {/* Tap anywhere to dismiss (behind the card so the button stays tappable) */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

        {/* Content card — the single animated element */}
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: 28,
              width: Math.min(width - 48, 360),
            },
          ]}
        >
          <View style={styles.orbWrap}>
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
          </View>

          <Text
            variant="headlineSmall"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {titleText}
          </Text>

          <Text
            variant="bodyMedium"
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          >
            {descriptionText}
          </Text>

          {showStreak ? (
            <>
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
            </>
          ) : null}

          {shieldUsed && badge ? (
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
          ) : null}

          <Button
            mode="contained"
            onPress={onDismiss}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            style={[primaryCapsule.style, { marginTop: 20, alignSelf: 'stretch' }]}
            contentStyle={primaryCapsule.contentStyle}
            labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
            accessibilityLabel="Dismiss milestone celebration"
          >
            Keep going
          </Button>
        </Animated.View>
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
