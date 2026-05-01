/**
 * Mood Weather Visualization - central "brain" for Mood screen.
 * Distinct visuals per weather: sun (clear), cloud (cloudy), fog (heavy), storm (turbulent), soft orb (settling).
 */

import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, Group, Circle, Path, RadialGradient, BlurMask, Skia, vec } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';

export type MoodWeatherType = 'clear' | 'cloudy' | 'heavy' | 'turbulent' | 'settling';

function getWeatherType(rating: number | undefined, volatile: boolean, hasHistory: boolean): MoodWeatherType {
  if (!hasHistory || rating === undefined) return 'settling';
  if (volatile) return 'turbulent';
  if (rating <= 4) return 'heavy';
  if (rating <= 6) return 'cloudy';
  return 'clear';
}

const WEATHER_COLORS: Record<MoodWeatherType, { core: string; mid: string; outer: string }> = {
  clear: { core: '#fbbf24', mid: '#f59e0b', outer: '#f97316' },
  cloudy: { core: '#94a3b8', mid: '#64748b', outer: '#475569' },
  heavy: { core: '#64748b', mid: '#475569', outer: '#334155' },
  turbulent: { core: '#6b7280', mid: '#4b5563', outer: '#374151' },
  settling: { core: '#cbd5e1', mid: '#94a3b8', outer: '#64748b' },
};

/** Cloud puff positions (cx, cy, r) relative to center - classic cumulus shape */
const CLOUDY_PUFFS = [
  { x: -12, y: -4, r: 14 },
  { x: 8, y: -6, r: 16 },
  { x: -4, y: 6, r: 18 },
  { x: 12, y: 4, r: 12 },
];

/** Heavy fog - denser, more layered puffs */
const HEAVY_PUFFS = [
  { x: -14, y: -2, r: 16 },
  { x: 10, y: -8, r: 18 },
  { x: -6, y: 8, r: 20 },
  { x: 14, y: 4, r: 14 },
  { x: 0, y: 0, r: 12 },
];

/** Storm cloud puffs - darker, lower */
const TURBULENT_PUFFS = [
  { x: -14, y: 2, r: 16 },
  { x: 10, y: -4, r: 18 },
  { x: -4, y: 10, r: 20 },
  { x: 12, y: 6, r: 14 },
];

/** Lightning bolt path - classic zigzag bolt */
function makeLightningPath(cx: number, cy: number, scale = 1) {
  const p = Skia.Path.Make();
  const w = 6 * scale;
  const h = 26 * scale;
  p.moveTo(cx, cy - h);
  p.lineTo(cx + w, cy - h / 3);
  p.lineTo(cx - w / 2, cy);
  p.lineTo(cx + w, cy + h / 2);
  p.lineTo(cx - w, cy + h);
  p.lineTo(cx - w / 2, cy + h / 3);
  p.lineTo(cx - w, cy);
  p.lineTo(cx, cy - h / 3);
  p.close();
  return p;
}

type MoodWeatherVisualizationProps = {
  size: number;
  canvasPadding?: number;
  rating?: number;
  volatile?: boolean;
  hasHistory?: boolean;
};

export function MoodWeatherVisualization({
  size,
  canvasPadding = 0,
  rating = 7,
  volatile = false,
  hasHistory = false,
}: MoodWeatherVisualizationProps) {
  const glowPulse = useSharedValue(0);
  const canvasSize = size + 2 * canvasPadding;
  const centerX = size / 2;
  const centerY = size / 2;
  const motifScale = Math.max(1.1, Math.min(1.7, size / 120));
  const scaled = (v: number) => v * motifScale;

  useEffect(() => {
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const weatherType = getWeatherType(rating, volatile, hasHistory);
  const colors = WEATHER_COLORS[weatherType];
  const glowOpacity = useDerivedValue(() => 0.25 + glowPulse.value * 0.2);
  const center = vec(centerX, centerY);
  const isSun = weatherType === 'clear';
  const lightningPath = useMemo(
    () => makeLightningPath(centerX, centerY, motifScale),
    [centerX, centerY, motifScale],
  );

  const SUN_SCALE = 1.4 * motifScale;
  const sunSphereR = 14 * SUN_SCALE;
  const sunCoronaR = 30 * SUN_SCALE;
  const sunBlur = Math.max(22, 20 * SUN_SCALE);
  const glowExtent = sunCoronaR + sunBlur;
  const glowOverflow = isSun
    ? Math.max(28, Math.ceil(glowExtent - (size / 2 + canvasPadding) + 8))
    : 0;
  const sunCanvasSize = isSun ? canvasSize + 2 * glowOverflow : canvasSize;
  const sunTranslate = isSun ? canvasPadding + glowOverflow : canvasPadding;

  const canvasContent = (
    <Group
      transform={[
        { translateX: sunTranslate },
        { translateY: sunTranslate },
      ]}
    >
      {isSun ? (
        <>
          {/* Corona / outer glow - larger canvas prevents square clip */}
          <Circle cx={centerX} cy={centerY} r={sunCoronaR} color="#fbbf24" opacity={glowOpacity}>
            <BlurMask blur={sunBlur} style="solid" />
          </Circle>
          {/* Sun sphere - radial gradient, 40% bigger */}
          <Circle cx={centerX} cy={centerY} r={sunSphereR}>
            <RadialGradient
              c={center}
              r={sunSphereR}
              colors={['#fef9c3', '#fde047', '#fbbf24', '#f97316']}
              positions={[0, 0.3, 0.7, 1]}
            />
          </Circle>
        </>
      ) : weatherType === 'cloudy' ? (
        /* Cloud - overlapping puffs */
        <>
          {CLOUDY_PUFFS.map(({ x, y, r }, i) => (
            <Circle
              key={i}
              cx={centerX + scaled(x)}
              cy={centerY + scaled(y)}
              r={scaled(r)}
              color={i === 2 ? colors.mid : colors.core}
              opacity={0.85}
            >
              <BlurMask blur={Math.max(4, scaled(4))} style="solid" />
            </Circle>
          ))}
        </>
      ) : weatherType === 'heavy' ? (
        /* Heavy fog - dense layered cloud */
        <>
          {HEAVY_PUFFS.map(({ x, y, r }, i) => (
            <Circle
              key={i}
              cx={centerX + scaled(x)}
              cy={centerY + scaled(y)}
              r={scaled(r)}
              color={i >= 3 ? colors.core : colors.mid}
              opacity={0.9}
            >
              <BlurMask blur={Math.max(8, scaled(8))} style="solid" />
            </Circle>
          ))}
        </>
      ) : weatherType === 'turbulent' ? (
        /* Storm - dark cloud + lightning */
        <>
          {TURBULENT_PUFFS.map(({ x, y, r }, i) => (
            <Circle
              key={i}
              cx={centerX + scaled(x)}
              cy={centerY + scaled(y)}
              r={scaled(r)}
              color={colors.outer}
              opacity={0.9}
            >
              <BlurMask blur={Math.max(6, scaled(6))} style="solid" />
            </Circle>
          ))}
          <Path path={lightningPath} color="#fef08a">
            <BlurMask blur={Math.max(2, scaled(2))} style="solid" />
          </Path>
        </>
      ) : (
        /* Settling - soft diffuse orb */
        <>
          <Circle cx={centerX} cy={centerY} r={scaled(28)} color={colors.outer} opacity={glowOpacity}>
            <BlurMask blur={Math.max(20, scaled(20))} style="solid" />
          </Circle>
          <Circle cx={centerX} cy={centerY} r={scaled(18)} color={colors.mid} opacity={glowOpacity}>
            <BlurMask blur={Math.max(12, scaled(12))} style="solid" />
          </Circle>
          <Circle cx={centerX} cy={centerY} r={scaled(10)} color={colors.core} opacity={0.7} />
        </>
      )}
    </Group>
  );

  if (isSun) {
    return (
      <View style={{ width: canvasSize, height: canvasSize, overflow: 'visible' }}>
        <Canvas
          style={{
            position: 'absolute',
            left: -glowOverflow,
            top: -glowOverflow,
            width: sunCanvasSize,
            height: sunCanvasSize,
            backgroundColor: 'transparent',
          }}
        >
          {canvasContent}
        </Canvas>
      </View>
    );
  }

  return (
    <Canvas style={{ width: canvasSize, height: canvasSize, backgroundColor: 'transparent' }}>
      {canvasContent}
    </Canvas>
  );
}
