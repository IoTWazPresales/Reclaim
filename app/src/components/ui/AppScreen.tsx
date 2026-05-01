import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native';
import { useAppTheme, type AppTheme } from '@/theme';

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
  paddingBottom = 120,
  style,
  contentContainerStyle,
  ...scrollViewProps
}: AppScreenProps) {
  const theme = useAppTheme();
  
  const paddingValue = typeof padding === 'number' ? padding : theme.spacing[padding];
  
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.background,
        },
        content: {
          padding: paddingValue,
          paddingBottom,
        },
      }),
    [theme.colors.background, paddingValue, paddingBottom]
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

