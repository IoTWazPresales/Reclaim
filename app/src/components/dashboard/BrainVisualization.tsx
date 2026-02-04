/**
 * Brain Visualization using React Native Skia
 * Shows a stylized brain with 6 regions that highlight based on active modules
 */

import React, { useEffect } from 'react';
import { Canvas, Path, Group, BlurMask, Circle } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';
import type { LifecycleNodeId, NodeStatuses } from './LifecycleHero';

type BrainVisualizationProps = {
  size: number;
  nodeStatuses: NodeStatuses;
};

// Brain region paths (anatomically inspired, simplified side view)
// Each region is a distinct lobe/structure mapped to app modules
const BRAIN_REGIONS: Record<LifecycleNodeId, string> = {
  // Prefrontal cortex (front top) - Mood & emotional regulation
  mood: 'M 45,25 Q 55,18 68,22 Q 72,28 68,35 Q 60,32 52,35 Q 48,30 45,25 Z',
  
  // Hippocampus (deep middle) - Sleep & memory consolidation
  sleep: 'M 68,52 Q 72,48 78,50 Q 82,54 80,60 Q 76,62 72,60 Q 68,56 68,52 Z',
  
  // Motor cortex (top center-back) - Training & movement
  training: 'M 75,25 Q 88,20 100,26 Q 102,32 98,38 Q 88,35 78,38 Q 73,32 75,25 Z',
  
  // Temporal lobe (lower side) - Meds & routine memory
  meds: 'M 52,62 Q 58,58 65,62 Q 68,70 64,76 Q 58,74 53,70 Q 50,66 52,62 Z',
  
  // Parietal lobe (back upper) - Breath & spatial awareness
  breath: 'M 100,35 Q 108,32 116,38 Q 118,44 114,50 Q 106,48 100,48 Q 98,42 100,35 Z',
  
  // Occipital lobe (back lower) - Insights & visual processing
  insights: 'M 108,52 Q 116,50 122,56 Q 124,62 120,68 Q 112,66 106,64 Q 104,58 108,52 Z',
};

// Brain outline (side view profile, more organic)
const BRAIN_OUTLINE = `
  M 68,18
  Q 58,15 48,20
  Q 38,26 32,35
  Q 28,45 28,55
  Q 28,65 32,73
  Q 38,82 48,88
  Q 58,92 70,92
  Q 82,92 94,90
  Q 106,86 114,80
  Q 122,72 126,62
  Q 130,52 130,42
  Q 128,32 122,26
  Q 114,20 104,18
  Q 94,16 84,18
  Q 76,16 68,18
  Z
`;

// Colors - Each region has its own vibrant color (inspired by cosmic brain visualization)
const REGION_COLORS: Record<LifecycleNodeId, string> = {
  mood: '#00d9ff',      // Bright cyan (emotional energy)
  sleep: '#8b5cf6',     // Purple (dreams, rest)
  training: '#f59e0b',  // Orange (physical energy)
  meds: '#10b981',      // Emerald green (health, balance)
  breath: '#3b82f6',    // Blue (calm, focus)
  insights: '#ec4899',  // Pink (creativity, analysis)
};

const INACTIVE_REGION = 'rgba(226, 232, 240, 0.15)';
const BRAIN_OUTLINE_COLOR = 'rgba(226, 232, 240, 0.3)';

export function BrainVisualization({ size, nodeStatuses }: BrainVisualizationProps) {
  // Pulsing glow animation
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // Derive glow intensity (oscillates between 4 and 12)
  const glowIntensity = useDerivedValue(() => {
    return 4 + glowPulse.value * 8;
  });

  // Scale factor to fit brain in the given size
  const scale = size / 160; // Brain is designed for ~160px

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale }]}>
        {/* Brain outline */}
        <Path
          path={BRAIN_OUTLINE}
          color={BRAIN_OUTLINE_COLOR}
          style="stroke"
          strokeWidth={2}
        />

        {/* Brain regions - each with unique color */}
        {(Object.entries(BRAIN_REGIONS) as [LifecycleNodeId, string][]).map(([nodeId, path]) => {
          const status = nodeStatuses[nodeId] ?? '—';
          const isActive = status !== '—';
          const regionColor = REGION_COLORS[nodeId];

          return (
            <Group key={nodeId}>
              {/* Region fill with unique color */}
              <Path
                path={path}
                color={isActive ? regionColor : INACTIVE_REGION}
                opacity={isActive ? 0.85 : 0.35}
              >
                {/* Stronger glow effect for active regions */}
                {isActive && <BlurMask blur={glowIntensity} style="solid" />}
              </Path>

              {/* Brighter pulsing node at region center */}
              {isActive && (
                <Circle
                  cx={getCenterX(nodeId)}
                  cy={getCenterY(nodeId)}
                  r={4}
                  color={regionColor}
                  opacity={glowPulse}
                >
                  <BlurMask blur={10} style="solid" />
                </Circle>
              )}
            </Group>
          );
        })}
      </Group>
    </Canvas>
  );
}

// Helper functions to get approximate center coordinates for each region
function getCenterX(nodeId: LifecycleNodeId): number {
  const centers: Record<LifecycleNodeId, number> = {
    mood: 56,
    sleep: 74,
    training: 88,
    meds: 60,
    breath: 108,
    insights: 114,
  };
  return centers[nodeId];
}

function getCenterY(nodeId: LifecycleNodeId): number {
  const centers: Record<LifecycleNodeId, number> = {
    mood: 28,
    sleep: 56,
    training: 31,
    meds: 68,
    breath: 42,
    insights: 60,
  };
  return centers[nodeId];
}
