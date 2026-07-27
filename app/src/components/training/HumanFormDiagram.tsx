/**
 * Animated human mannequin form cue — primary exercise illustration.
 * Joint poses from humanFormPoses; loops stretch ↔ contracted by movement intent.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from 'react-native-paper';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { MovementIntent } from '@/lib/training/types';
import { primaryIntentForDiagram } from '@/lib/training/movementPatternCues';
import {
  layoutHuman,
  lerpPose,
  posePairForIntent,
} from '@/lib/training/humanFormPoses';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  intents: MovementIntent[];
  size?: number;
  exerciseName?: string | null;
  exerciseId?: string | null;
};

export default function HumanFormDiagram({
  intents,
  size = 160,
  exerciseName,
  exerciseId,
}: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const intent = primaryIntentForDiagram(intents, exerciseName, exerciseId);
  const pair = useMemo(() => posePairForIntent(intent), [intent]);

  const progress = useSharedValue(reduceMotion ? 0.5 : 0);
  const [t, setT] = useState(reduceMotion ? 0.5 : 0);

  useEffect(() => {
    cancelAnimation(progress);
    if (reduceMotion) {
      progress.value = 0.5;
      setT(0.5);
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [reduceMotion, intent, progress]);

  useAnimatedReaction(
    () => progress.value,
    (value) => {
      runOnJS(setT)(value);
    },
    [progress],
  );

  const layout = useMemo(() => layoutHuman(lerpPose(pair.start, pair.end, t), size), [pair, t, size]);
  const body = theme.colors.primary;
  const accent = theme.colors.secondary;
  const far = theme.colors.onSurfaceVariant;
  const sw = layout.stroke;
  const farSw = sw * 0.72;

  const label = `${exerciseName?.trim() || exerciseId || 'Exercise'} form animation`;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ alignItems: 'center', justifyContent: 'center', minHeight: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Far limbs (depth) */}
        <Line
          x1={layout.hip.x}
          y1={layout.hip.y}
          x2={layout.kneeB.x}
          y2={layout.kneeB.y}
          stroke={far}
          strokeWidth={farSw}
          strokeLinecap="round"
          opacity={0.45}
        />
        <Line
          x1={layout.kneeB.x}
          y1={layout.kneeB.y}
          x2={layout.ankleB.x}
          y2={layout.ankleB.y}
          stroke={far}
          strokeWidth={farSw}
          strokeLinecap="round"
          opacity={0.45}
        />
        <Line
          x1={layout.shoulder.x}
          y1={layout.shoulder.y}
          x2={layout.elbowB.x}
          y2={layout.elbowB.y}
          stroke={far}
          strokeWidth={farSw}
          strokeLinecap="round"
          opacity={0.4}
        />
        <Line
          x1={layout.elbowB.x}
          y1={layout.elbowB.y}
          x2={layout.wristB.x}
          y2={layout.wristB.y}
          stroke={far}
          strokeWidth={farSw}
          strokeLinecap="round"
          opacity={0.4}
        />

        {/* Near leg */}
        <Line
          x1={layout.hip.x}
          y1={layout.hip.y}
          x2={layout.knee.x}
          y2={layout.knee.y}
          stroke={body}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <Line
          x1={layout.knee.x}
          y1={layout.knee.y}
          x2={layout.ankle.x}
          y2={layout.ankle.y}
          stroke={body}
          strokeWidth={sw}
          strokeLinecap="round"
        />

        {/* Torso */}
        <Line
          x1={layout.hip.x}
          y1={layout.hip.y}
          x2={layout.neck.x}
          y2={layout.neck.y}
          stroke={body}
          strokeWidth={sw * 1.15}
          strokeLinecap="round"
        />

        {/* Working arm (accent) */}
        <Line
          x1={layout.shoulder.x}
          y1={layout.shoulder.y}
          x2={layout.elbow.x}
          y2={layout.elbow.y}
          stroke={accent}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <Line
          x1={layout.elbow.x}
          y1={layout.elbow.y}
          x2={layout.wrist.x}
          y2={layout.wrist.y}
          stroke={accent}
          strokeWidth={sw}
          strokeLinecap="round"
        />

        {/* Joint dots for mass */}
        <Circle cx={layout.hip.x} cy={layout.hip.y} r={sw * 0.45} fill={body} />
        <Circle cx={layout.shoulder.x} cy={layout.shoulder.y} r={sw * 0.4} fill={body} />
        <Circle cx={layout.knee.x} cy={layout.knee.y} r={sw * 0.35} fill={body} />
        <Circle cx={layout.elbow.x} cy={layout.elbow.y} r={sw * 0.32} fill={accent} />

        {/* Head */}
        <Circle
          cx={layout.head.cx}
          cy={layout.head.cy}
          r={layout.head.r}
          fill={body}
          opacity={0.92}
        />
      </Svg>
    </View>
  );
}
