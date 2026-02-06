/**
 * Premium Starfield using React Native Skia
 * Twinkling stars with varying sizes, colors, and glow effects
 */

import React, { useEffect, useMemo } from 'react';
import { Canvas, Circle, BlurMask, Group } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, withDelay, Easing } from 'react-native-reanimated';

type PremiumStarfieldProps = {
  width: number;
  height: number;
};

type Star = {
  x: number;
  y: number;
  size: number;
  brightness: number;
  color: string;
  twinkleDelay: number;
  twinkleDuration: number;
  hasGlow: boolean;
};

// Generate deterministic stars
function generateStars(width: number, height: number, count: number): Star[] {
  const stars: Star[] = [];
  const seed = 42069; // Deterministic seed

  for (let i = 0; i < count; i++) {
    const random = (seed + i * 9973) % 10000 / 10000;
    const random2 = (seed + i * 7919) % 10000 / 10000;
    const random3 = (seed + i * 6151) % 10000 / 10000;
    const random4 = (seed + i * 4327) % 10000 / 10000;

    // Size distribution: mostly tiny stars, no big ones (avoids "white dot" look)
    let size: number;
    if (random < 0.85) {
      size = 0.5; // 85% very small
    } else if (random < 0.96) {
      size = 0.75; // 11% small
    } else {
      size = 1; // 4% medium max
    }

    // Brightness tiers
    const brightness = random2 < 0.3 ? 0.35 : random2 < 0.6 ? 0.5 : random2 < 0.85 ? 0.65 : 0.8;

    // Color variation: mostly white, some blue-white, some warm
    let color: string;
    if (random3 < 0.7) {
      color = 'rgba(255, 255, 255, 1)'; // Pure white
    } else if (random3 < 0.85) {
      color = 'rgba(200, 220, 255, 1)'; // Blue-white
    } else {
      color = 'rgba(255, 240, 220, 1)'; // Warm white
    }

    // Only a few tiny stars get subtle glow - avoid pulsing dot look
    const hasGlow = size >= 0.75 && brightness >= 0.65 && random4 > 0.7;

    stars.push({
      x: random * width,
      y: random2 * height,
      size,
      brightness,
      color,
      twinkleDelay: random4 * 3000, // Stagger twinkle start
      twinkleDuration: 1500 + random3 * 1500, // Vary twinkle speed
      hasGlow,
    });
  }

  return stars;
}

export function PremiumStarfield({ width, height }: PremiumStarfieldProps) {
  // Generate stars (memoized so they don't change on re-render)
  const stars = useMemo(() => generateStars(width, height, 120), [width, height]);

  return (
    <Canvas style={{ width, height, position: 'absolute', top: 0, left: 0 }}>
      {stars.map((star, i) => (
        <TwinklingStar key={i} star={star} index={i} />
      ))}
    </Canvas>
  );
}

// Individual star component with twinkling
function TwinklingStar({ star, index }: { star: Star; index: number }) {
  const opacity = useSharedValue(star.brightness);

  useEffect(() => {
    // Subtle twinkling - smaller range so stars don't pulse obviously
    opacity.value = withDelay(
      star.twinkleDelay,
      withRepeat(
        withTiming(star.brightness * 0.5, {
          duration: star.twinkleDuration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
  }, []);

  return (
    <Group>
      {/* Main star */}
      <Circle cx={star.x} cy={star.y} r={star.size} color={star.color} opacity={opacity} />

      {/* Very subtle glow for a few stars */}
      {star.hasGlow && (
        <Circle cx={star.x} cy={star.y} r={star.size * 1.5} color={star.color} opacity={opacity}>
          <BlurMask blur={1} style="solid" />
        </Circle>
      )}
    </Group>
  );
}
