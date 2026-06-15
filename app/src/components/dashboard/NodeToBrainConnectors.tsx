/**
 * Connector lines from outer category nodes to brain regions.
 * Nodes are at fixed positions; connectors always visible, dimmed when inactive.
 */

import React from 'react';
import { Canvas, Line, vec, Group, BlurMask } from '@shopify/react-native-skia';
import type { LifecycleNodeId, NodeStatuses } from './LifecycleHero';
import { getRegionCenter } from './BrainVisualization';
import { VIEW_WIDTH, LAYER_TX, LAYER_TY, getBrainCanvasOffsetY } from './heroLayout';
import { useAppTheme } from '@/theme';

// Compute node angles dynamically based on brain region positions
export function getNodeAngle(
  nodeId: LifecycleNodeId,
  cx: number,
  cy: number,
  brainSize: number,
  scale: number
): number {
  const c = getRegionCenter(nodeId);
  
  // Transform brain region to diagram space
  const viewBoxX = c.x + LAYER_TX;
  const viewBoxY = c.y + LAYER_TY;
  const scaledX = viewBoxX * scale;
  const scaledY = viewBoxY * scale;
  const offsetX = (brainSize - VIEW_WIDTH * scale) / 2;
  const offsetY = getBrainCanvasOffsetY(brainSize);
  
  const regionX = cx - brainSize / 2 + offsetX + scaledX;
  const regionY = cy - brainSize / 2 + offsetY + scaledY;
  
  // Compute angle from center to this region
  const dx = regionX - cx;
  const dy = regionY - cy;
  const angleRad = Math.atan2(dx, -dy); // -dy because y-down
  let angleDeg = (angleRad * 180) / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  
  return angleDeg;
}

// Convert brain region from path space to diagram space
function getBrainRegionHeroCoords(
  nodeId: LifecycleNodeId,
  cx: number,
  cy: number,
  brainSize: number,
  scale: number,
  brainOffsetX: number = 0,
  brainOffsetY: number = 0
): { x: number; y: number } {
  const c = getRegionCenter(nodeId); // Path space coordinates
  
  // Apply the same transform chain as BrainVisualization:
  const viewBoxX = c.x + LAYER_TX;
  const viewBoxY = c.y + LAYER_TY;
  const scaledX = viewBoxX * scale;
  const scaledY = viewBoxY * scale;
  const offsetX = (brainSize - VIEW_WIDTH * scale) / 2;
  const offsetY = getBrainCanvasOffsetY(brainSize);
  
  return {
    x: cx - brainSize / 2 + offsetX + scaledX + brainOffsetX,
    y: cy - brainSize / 2 + offsetY + scaledY + brainOffsetY,
  };
}

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

type NodeToBrainConnectorsProps = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  rOuter: number;
  brainSize: number;
  brainOffsetX?: number;
  brainOffsetY?: number;
  nodeStatuses: NodeStatuses;
};

export function NodeToBrainConnectors({
  width,
  height,
  cx,
  cy,
  rOuter,
  brainSize,
  brainOffsetX = 0,
  brainOffsetY = 0,
  nodeStatuses,
}: NodeToBrainConnectorsProps) {
  const appTheme = useAppTheme();
  const regionColors = appTheme.domainAccents;
  const scale = brainSize / VIEW_WIDTH;
  const nodeRadius = rOuter + 2;

  return (
    <Canvas
      style={{ position: 'absolute', left: 0, top: 0, width, height, backgroundColor: 'transparent' }}
      pointerEvents="none"
    >
      {(['mood', 'sleep', 'training', 'meds', 'insights'] as LifecycleNodeId[]).map((nodeId) => {
        const status = nodeStatuses[nodeId] ?? '—';
        const isActive = status !== '—';
        const angle = getNodeAngle(nodeId, cx, cy, brainSize, scale);
        const from = polarToCart(cx, cy, nodeRadius, angle);
        const to = getBrainRegionHeroCoords(nodeId, cx, cy, brainSize, scale, brainOffsetX, brainOffsetY);
        const color = regionColors[nodeId];
        const lineColor = isActive ? color : 'rgba(148, 163, 184, 0.18)';

        return (
          <Group key={nodeId}>
            <Line
              p1={vec(from.x, from.y)}
              p2={vec(to.x, to.y)}
              color={lineColor}
              strokeWidth={isActive ? 0.8 : 0.4}
            >
              {isActive && <BlurMask blur={3} style="solid" />}
            </Line>
          </Group>
        );
      })}
    </Canvas>
  );
}
