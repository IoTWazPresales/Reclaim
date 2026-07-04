import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from 'react-native-paper';
import { mapCatalogCategoryToMotif, type MedClassMotif } from '@/lib/chemistryGlossary';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const MOTIF_PATHS: Record<MedClassMotif, string> = {
  ssri: 'M8 40 L20 16 L32 28 L44 12 L56 40',
  stimulant: 'M12 36 L28 20 L44 36 M20 28 L36 28',
  benzo: 'M14 38 L14 18 L34 18 L34 38 Z M38 38 L38 22 L54 22 L54 38 Z',
  opioid: 'M16 36 C16 20 40 20 40 36 C40 28 16 28 16 36 Z',
  nsaid: 'M12 32 L28 16 L44 32 L28 40 Z',
  statin: 'M10 34 L26 18 L42 34 M18 26 L34 26',
  antipsychotic: 'M16 36 L32 14 L48 36 M24 24 L40 24',
  generic: 'M14 34 L30 18 L46 34',
};

type Props = {
  category?: string | null;
  medicationClass?: string | null;
  size?: number;
};

export default function MoleculeMotif({ category, medicationClass, size = 64 }: Props) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const motif = mapCatalogCategoryToMotif(category, medicationClass);
  const path = MOTIF_PATHS[motif];
  const dashProgress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    dashProgress.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [dashProgress, reducedMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: reducedMotion ? 0 : (1 - dashProgress.value) * 120,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 64 48">
        <AnimatedPath
          d={path}
          stroke={theme.colors.primary}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={reducedMotion ? undefined : 120}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}
