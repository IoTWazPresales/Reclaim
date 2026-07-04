import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native';
import { useAppTheme, type AppTheme } from '@/theme';
import {
  RECLAIM_SCREEN_HORIZONTAL,
  RECLAIM_SCREEN_TAB_BAR_INSET,
  RECLAIM_SCREEN_TOP_INSET,
  reclaimStandardScreenScroll,
} from '@/theme/reclaimScreenLayout';

type SpacingKey = keyof AppTheme['spacing'];

export interface AppScreenProps extends Omit<ScrollViewProps, 'contentContainerStyle'> {
  children: React.ReactNode;
  padding?: SpacingKey | number;
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
export function AppScreen({
  children,
  padding = 'lg',
  paddingBottom = RECLAIM_SCREEN_TAB_BAR_INSET,
  style,
  contentContainerStyle,
  ...scrollViewProps
}: AppScreenProps) {
  const theme = useAppTheme();

  const paddingValue = typeof padding === 'number' ? padding : theme.spacing[padding];
  const useCanonicalPadding =
    paddingValue === RECLAIM_SCREEN_HORIZONTAL && paddingBottom === RECLAIM_SCREEN_TAB_BAR_INSET;

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.background,
        },
        content: useCanonicalPadding
          ? reclaimStandardScreenScroll
          : {
              padding: paddingValue,
              paddingTop: RECLAIM_SCREEN_TOP_INSET,
              paddingBottom,
            },
      }),
    [theme.colors.background, paddingValue, paddingBottom, useCanonicalPadding],
  );

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
}
