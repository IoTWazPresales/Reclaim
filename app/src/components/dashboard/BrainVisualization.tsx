/**
 * Brain Visualization using React Native Skia
 * Uses traced SVG path from assets/brain.svg - lateral view, frontal top-left, cerebellum bottom-right
 */

import React, { useEffect, useMemo } from 'react';
import { Canvas, Path, Group, Circle, BlurMask } from '@shopify/react-native-skia';
import { useSharedValue, cancelAnimation, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';
import type { LifecycleNodeId, NodeStatuses } from './LifecycleHero';
import { BRAIN_SVG_PATH } from './brainPath';
import { VIEW_WIDTH, VIEW_HEIGHT, LAYER_TX, LAYER_TY, getBrainCanvasOffsetY } from './heroLayout';
import { useAppTheme } from '@/theme';

type BrainVisualizationProps = {
  size: number;
  canvasPadding?: number;
  nodeStatuses: NodeStatuses;
  animationActive?: boolean;
};

// Region centers in PATH space (pre-layer-transform) - anatomically positioned on brain
// Brain path Y: ~133-266, X: ~10-177. Lateral view: left=front, right=back
// Based on user feedback: pink(insights)=far left above center, purple(sleep)=right above center,
// orange(training)=far low right, meds=upper-left with prefrontal
export function getRegionCenter(nodeId: LifecycleNodeId): { x: number; y: number } {
  const centers: Record<LifecycleNodeId, { x: number; y: number }> = {
    mood: { x: 93, y: 143 },         // Cyan - top center
    sleep: { x: 155, y: 172 },       // Purple - upper-right (back, upper)
    training: { x: 152, y: 232 },    // Orange - lower-right (back, lower)
    meds: { x: 45, y: 235 },         // Green - lower-left (front, lower)
    insights: { x: 38, y: 162 },     // Pink - upper-left (front, upper)
    breath: { x: 93, y: 250 },       // Unused
  };
  return centers[nodeId];
}

export function BrainVisualization({
  size,
  canvasPadding = 0,
  nodeStatuses,
  animationActive = true,
}: BrainVisualizationProps) {
  const appTheme = useAppTheme();
  const regionColors = appTheme.domainAccents;
  const brainFill = appTheme.dark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(226, 232, 240, 0.55)';
  const outlineStroke = useMemo(
    () => `${appTheme.colors.primary}66`,
    [appTheme.colors.primary],
  );
  const glowPulse = useSharedValue(0);
  const canvasSize = size + 2 * canvasPadding;
  const scale = size / VIEW_WIDTH;

  useEffect(() => {
    if (!animationActive) {
      cancelAnimation(glowPulse);
      return;
    }
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(glowPulse);
  }, [animationActive, glowPulse]);

  const glowOpacity = useDerivedValue(() => 0.25 + glowPulse.value * 0.2);
  const offsetX = (size - VIEW_WIDTH * scale) / 2;
  // Center based on actual content height (not VIEW_HEIGHT)
  const offsetY = getBrainCanvasOffsetY(size);

  return (
    <Canvas style={{ width: canvasSize, height: canvasSize }}>
      <Group
        transform={[
          { translateX: canvasPadding },
          { translateY: canvasPadding },
          { translateX: offsetX },
          { translateY: offsetY },
          { scale },
          { translateX: LAYER_TX },
          { translateY: LAYER_TY },
        ]}
      >
        {/* Brain fill */}
        <Path path={BRAIN_SVG_PATH} color={brainFill} />

        {/* Brain outline */}
        <Path
          path={BRAIN_SVG_PATH}
          color={outlineStroke}
          style="stroke"
          strokeWidth={0.5}
        />

        {/* Glow regions at connector points - organic shapes contouring brain sections */}
        {(Object.keys(regionColors) as LifecycleNodeId[])
          .filter((nodeId) => nodeId !== 'breath') // Skip breath
          .map((nodeId) => {
            const status = nodeStatuses[nodeId] ?? '—';
            const isActive = status !== '—';
            const regionColor = regionColors[nodeId];
            const center = getRegionCenter(nodeId);
            const glowColor = isActive ? regionColor : 'rgba(148, 163, 184, 0.2)';

            return (
              <Group key={nodeId}>
                {/* Large outer glow - organic shape */}
                <Circle cx={center.x} cy={center.y} r={18} color={glowColor} opacity={glowOpacity}>
                  <BlurMask blur={20} style="solid" />
                </Circle>
                {/* Medium glow layer */}
                <Circle cx={center.x} cy={center.y} r={10} color={glowColor} opacity={glowOpacity}>
                  <BlurMask blur={12} style="solid" />
                </Circle>
                {/* Inner core */}
                <Circle cx={center.x} cy={center.y} r={4} color={glowColor} opacity={glowOpacity}>
                  <BlurMask blur={5} style="solid" />
                </Circle>
              </Group>
            );
          })}
      </Group>
    </Canvas>
  );
}
