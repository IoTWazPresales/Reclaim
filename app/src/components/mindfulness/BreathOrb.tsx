import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  streak: number;
  latestText: string;
  onPress: () => void;
  disabled?: boolean;
};

const INHALE_MS = 4000;
const EXHALE_MS = 4000;

export function BreathOrb({ streak, latestText, onPress, disabled }: Props) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const accent = appTheme.domainAccents.breath;
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: INHALE_MS, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: EXHALE_MS, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, scale]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.72 + (scale.value - 1) * 0.35 }],
    opacity: 0.35 + (scale.value - 1) * 0.25,
  }));

  return (
    <View style={{ alignItems: 'center', marginBottom: 8 }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Start a 2-minute mindfulness reset"
        style={{ alignItems: 'center' }}
      >
        <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 140,
                height: 140,
                borderRadius: 70,
                borderWidth: 2,
                borderColor: accent,
                opacity: 0.35,
              },
              outerStyle,
            ]}
          />
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: accent,
                opacity: 0.2,
              },
              innerStyle,
            ]}
          />
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              borderWidth: 2,
              borderColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text variant="labelMedium" style={{ color: accent, fontWeight: '800', textAlign: 'center' }}>
              Tap{'\n'}2 min
            </Text>
          </View>
        </View>
      </Pressable>
      <Text variant="bodySmall" style={{ marginTop: 10, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
        Streak {streak} day{streak === 1 ? '' : 's'} · {latestText}
      </Text>
    </View>
  );
}
