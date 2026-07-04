import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { dashboardStreakCardTokens } from '@/theme/dashboardStreakCard';

const AnimatedView = Animated.createAnimatedComponent(View);

type StreakFlameProps = {
  active: boolean;
  reduceMotion: boolean;
  color: string;
  size?: number;
};

/** Slow breathing glow behind an active streak ring. */
export function StreakFlame({ active, reduceMotion, color, size = 88 }: StreakFlameProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    if (!active || reduceMotion) {
      scale.value = 1;
      opacity.value = active ? 0.25 : 0;
      return;
    }
    scale.value = withRepeat(
      withTiming(dashboardStreakCardTokens.orbGlowScaleMax, {
        duration: dashboardStreakCardTokens.orbGlowDurationMs,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withTiming(0.55, { duration: dashboardStreakCardTokens.orbGlowDurationMs, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [active, reduceMotion, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!active) return null;

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        styles.flame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  flame: {
    position: 'absolute',
    alignSelf: 'center',
  },
});
