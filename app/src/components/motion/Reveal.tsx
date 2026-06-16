/**
 * Calm entrance — fade + 10px rise, optional stagger. End state visible under reduced motion.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';

type RevealProps = {
  children: React.ReactNode;
  /** Stagger delay in ms (60–80ms typical) */
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

export function Reveal({ children, delay = 0, style }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(420)
        .delay(delay)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
