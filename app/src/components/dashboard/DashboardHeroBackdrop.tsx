import React from 'react';
import { View } from 'react-native';

import { LifecycleHero, type LifecycleNodeId, type NodeStatuses } from '@/components/dashboard/LifecycleHero';
import { PremiumStarfield } from '@/components/dashboard/PremiumStarfield';

type DashboardHeroBackdropProps = {
  screenWidth: number;
  contentHeight: number;
  onContentLayout: (height: number) => void;
  nodeStatuses: NodeStatuses;
  onNodePress: (nodeId: LifecycleNodeId) => void;
  animationActive?: boolean;
  children: React.ReactNode;
};

export function DashboardHeroBackdrop({
  screenWidth,
  contentHeight,
  onContentLayout,
  nodeStatuses,
  onNodePress,
  animationActive = true,
  children,
}: DashboardHeroBackdropProps) {
  return (
    <View
      style={{ position: 'relative' }}
      onLayout={(e) => onContentLayout(e.nativeEvent.layout.height)}
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <PremiumStarfield width={screenWidth} height={contentHeight} animationActive={animationActive} />
      </View>
      <LifecycleHero
        nodeStatuses={nodeStatuses}
        onNodePress={onNodePress}
        animationActive={animationActive}
      />
      {children}
    </View>
  );
}
