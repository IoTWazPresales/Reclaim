/**
 * Subtle premium-surface particle wash — reserved for paywall polish (Phase 3.4).
 */
import React, { useEffect, useMemo } from 'react';
import { Canvas, Circle, BlurMask, Group } from '@shopify/react-native-skia';
import {
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type PaywallPremiumBackdropProps = {
  width: number;
  height: number;
  accent: string;
};

type Speck = { x: number; y: number; r: number; phase: number };

function makeSpecks(width: number, height: number, count: number): Speck[] {
  const out: Speck[] = [];
  let seed = 90210;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };
  for (let i = 0; i < count; i++) {
    out.push({
      x: rand() * width,
      y: rand() * height,
      r: 1.2 + rand() * 2.4,
      phase: rand(),
    });
  }
  return out;
}

export function PaywallPremiumBackdrop({ width, height, accent }: PaywallPremiumBackdropProps) {
  const reduceMotion = useReducedMotion();
  const specks = useMemo(() => makeSpecks(width, height, 36), [width, height]);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(drift);
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(drift);
  }, [drift, reduceMotion]);

  return (
    <Canvas style={{ position: 'absolute', top: 0, left: 0, width, height }} pointerEvents="none">
      {specks.map((s, i) => (
        <DriftingSpeck key={i} speck={s} accent={accent} drift={drift} />
      ))}
    </Canvas>
  );
}

function DriftingSpeck({
  speck,
  accent,
  drift,
}: {
  speck: Speck;
  accent: string;
  drift: { value: number };
}) {
  const cy = useDerivedValue(() => {
    const offset = Math.sin((drift.value + speck.phase) * Math.PI * 2) * 10;
    return speck.y + offset;
  });
  const opacity = useDerivedValue(() => 0.18 + Math.sin((drift.value + speck.phase) * Math.PI) * 0.12);

  return (
    <Group>
      <Circle cx={speck.x} cy={cy} r={speck.r * 2.2} color={accent} opacity={opacity}>
        <BlurMask blur={6} style="solid" />
      </Circle>
      <Circle cx={speck.x} cy={cy} r={speck.r} color={accent} opacity={opacity} />
    </Group>
  );
}
