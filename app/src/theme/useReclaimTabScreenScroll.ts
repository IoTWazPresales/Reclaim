import { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RECLAIM_SCREEN_HORIZONTAL,
  RECLAIM_SCREEN_TOP_INSET,
  reclaimLiveTabBarScrollInset,
} from '@/theme/reclaimScreenLayout';

/**
 * Bottom clearance for a screen that scrolls above the tab bar.
 * Uses the live system inset so gesture nav and 3-button nav do not share the 140 fudge.
 */
export function useReclaimTabScreenScroll(kind: 'standard' | 'hero'): ViewStyle {
  const insets = useSafeAreaInsets();
  const paddingBottom = reclaimLiveTabBarScrollInset(insets.bottom);
  return useMemo(() => {
    if (kind === 'hero') return { paddingBottom };
    return {
      paddingHorizontal: RECLAIM_SCREEN_HORIZONTAL,
      paddingTop: RECLAIM_SCREEN_TOP_INSET,
      paddingBottom,
    };
  }, [kind, paddingBottom]);
}
