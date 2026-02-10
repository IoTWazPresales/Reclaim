/**
 * Sleep Moon Visualization - moon phase based on sleep quality.
 * Full moon = great sleep, crescent = poor, new/faint = no data.
 */

import React, { useEffect } from 'react';
import { useTheme } from 'react-native-paper';
import { Canvas, Group, Circle, BlurMask } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';

/** 0 = new/dark, 1 = full. Derived from duration vs target, efficiency, quality. */
function getMoonPhase(opts: {
  durationMin?: number | null;
  targetSleepMinutes?: number;
  efficiency?: number | null;
  quality?: number | null;
  hasData: boolean;
}): number {
  const { durationMin, targetSleepMinutes = 480, efficiency, quality, hasData } = opts;
  if (!hasData) return 0;

  const durationPct =
    targetSleepMinutes > 0 && typeof durationMin === 'number' && Number.isFinite(durationMin)
      ? Math.min(1.2, durationMin / targetSleepMinutes)
      : 0;
  const eff = typeof efficiency === 'number' && Number.isFinite(efficiency) ? efficiency : null;
  const qual =
    typeof quality === 'number' && Number.isFinite(quality) ? quality / 100 : null;

  const score =
    eff != null && qual != null
      ? (durationPct + eff + qual) / 3
      : eff != null
        ? (durationPct + eff) / 2
        : qual != null
          ? (durationPct + qual) / 2
          : durationPct;

  return Math.max(0, Math.min(1, score));
}

const MOON_LIGHT = '#f5f5dc';
const MOON_GLOW = 'rgba(245, 245, 220, 0.35)';

type SleepMoonVisualizationProps = {
  size: number;
  canvasPadding?: number;
  durationMin?: number | null;
  targetSleepMinutes?: number;
  efficiency?: number | null;
  quality?: number | null;
  hasData?: boolean;
};

export function SleepMoonVisualization({
  size,
  canvasPadding = 0,
  durationMin,
  targetSleepMinutes = 480,
  efficiency,
  quality,
  hasData = false,
}: SleepMoonVisualizationProps) {
  const theme = useTheme();
  const glowPulse = useSharedValue(0);
  const canvasSize = size + 2 * canvasPadding;
  const centerX = size / 2;
  const centerY = size / 2;

  useEffect(() => {
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const phase = getMoonPhase({
    durationMin,
    targetSleepMinutes,
    efficiency,
    quality,
    hasData,
  });
  const glowOpacity = useDerivedValue(() => 0.2 + glowPulse.value * 0.15);
  const backgroundColor = theme.colors.background;

  const moonR = Math.min(size * 0.35, 28);
  const shadowOffsetX = phase >= 1 ? moonR * 3 : phase * moonR * 2;

  return (
    <Canvas style={{ width: canvasSize, height: canvasSize }}>
      <Group
        transform={[{ translateX: canvasPadding }, { translateY: canvasPadding }]}
      >
        {hasData ? (
          <>
            {/* Glow - visible when moon has appreciable phase */}
            {phase >= 0.15 && (
              <Circle
                cx={centerX}
                cy={centerY}
                r={moonR * 1.4}
                color={MOON_GLOW}
                opacity={glowOpacity}
              >
                <BlurMask blur={12} style="solid" />
              </Circle>
            )}
            {/* Moon body - lit portion (full circle, we'll mask with shadow) */}
            <Circle
              cx={centerX}
              cy={centerY}
              r={moonR}
              color={MOON_LIGHT}
              opacity={phase >= 0.95 ? 1 : 0.92}
            />
            {/* Shadow overlay - creates phase. When phase=0 (new moon), shadow fully covers. */}
            {phase < 0.99 && (
              <Circle
                cx={centerX + shadowOffsetX}
                cy={centerY}
                r={moonR * 1.02}
                color={backgroundColor}
              />
            )}
          </>
        ) : (
          /* No data - faint new moon outline */
          <Circle
            cx={centerX}
            cy={centerY}
            r={moonR}
            color="rgba(148, 163, 184, 0.25)"
            opacity={0.6}
          />
        )}
      </Group>
    </Canvas>
  );
}
