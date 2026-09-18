import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, type AppTheme } from '@/theme';
import {
  RECLAIM_SCREEN_HORIZONTAL,
  RECLAIM_SCREEN_TOP_INSET,
  reclaimLiveTabBarScrollInset,
} from '@/theme/reclaimScreenLayout';

type SpacingKey = keyof AppTheme['spacing'];

export interface AppScreenProps extends Omit<ScrollViewProps, 'contentContainerStyle'> {
  children: React.ReactNode;
  padding?: SpacingKey | number;
  /** Override live tab-bar + system-inset clearance. Omit to use live insets. */
  paddingBottom?: number;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}

/**
 * AppScreen - Standardized screen wrapper with consistent padding
 *
 * @example
 * <AppScreen padding="lg" paddingBottom={120}>
 *   <AppCard>Content</AppCard>
 * </AppScreen>
 */
export const AppScreen = React.forwardRef<ScrollView, AppScreenProps>(function AppScreen(
  {
    children,
    padding = 'lg',
    paddingBottom,
    style,
    contentContainerStyle,
    ...scrollViewProps
  },
  ref,
) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const paddingValue = typeof padding === 'number' ? padding : theme.spacing[padding];
  const resolvedPaddingBottom = paddingBottom ?? reclaimLiveTabBarScrollInset(insets.bottom);
  const useCanonicalPadding =
    paddingValue === RECLAIM_SCREEN_HORIZONTAL && paddingBottom === undefined;

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.background,
        },
        content: useCanonicalPadding
          ? {
              paddingHorizontal: RECLAIM_SCREEN_HORIZONTAL,
              paddingTop: RECLAIM_SCREEN_TOP_INSET,
              paddingBottom: resolvedPaddingBottom,
            }
          : {
              padding: paddingValue,
              paddingTop: RECLAIM_SCREEN_TOP_INSET,
              paddingBottom: resolvedPaddingBottom,
            },
      }),
    [theme.colors.background, paddingValue, resolvedPaddingBottom, useCanonicalPadding],
  );

  return (
    <ScrollView
      ref={ref}
      style={[styles.container, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
});
