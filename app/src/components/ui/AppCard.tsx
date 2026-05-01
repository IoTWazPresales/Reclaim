import React from 'react';
import { Card } from 'react-native-paper';
import { useAppTheme, type AppTheme } from '@/theme';

type SpacingKey = keyof AppTheme['spacing'];
type BorderRadiusKey = keyof AppTheme['borderRadius'];
type PaperCardProps = React.ComponentProps<typeof Card>;

export interface AppCardProps extends Omit<PaperCardProps, 'style' | 'mode'> {
  children: React.ReactNode;
  mode?: 'elevated' | 'outlined' | 'flat' | 'contained' | 'contained-tonal';
  marginBottom?: SpacingKey | number;
  borderRadius?: BorderRadiusKey | number;
  style?: PaperCardProps['style'];
}

/**
 * AppCard - Standardized card component with consistent styling
 * 
 * @example
 * <AppCard mode="elevated" marginBottom="lg">
 *   <Card.Content>
 *     <Text>Content</Text>
 *   </Card.Content>
 * </AppCard>
 */
export function AppCard({
  children,
  mode = 'elevated',
  marginBottom = 'lg',
  borderRadius: borderRadiusProp,
  style,
  ...cardProps
}: AppCardProps) {
  const theme = useAppTheme();
  
  const marginBottomValue = typeof marginBottom === 'number' ? marginBottom : theme.spacing[marginBottom];
  const borderRadiusValue = borderRadiusProp
    ? typeof borderRadiusProp === 'number'
      ? borderRadiusProp
      : theme.borderRadius[borderRadiusProp]
    : theme.borderRadius.xl;

  const cardStyle = React.useMemo(
    () => [
      {
        borderRadius: borderRadiusValue,
        marginBottom: marginBottomValue,
        // Keep card fill solid so it does not blend with dynamic backgrounds.
        backgroundColor: theme.dark ? '#1A2742' : theme.colors.surface,
        // Restore a clearer neumorphic raised surface.
        ...(mode === 'elevated' || mode === 'outlined' || mode === 'contained'
          ? {
              elevation: theme.dark ? 5 : 6,
              shadowColor: theme.dark ? '#000000' : theme.colors.primary,
              shadowOffset: { width: 0, height: theme.dark ? 8 : 7 },
              shadowOpacity: theme.dark ? 0.34 : 0.2,
              shadowRadius: theme.dark ? 16 : 12,
              borderWidth: 1,
              borderColor: theme.dark ? 'rgba(143,177,235,0.18)' : 'rgba(255,255,255,0.88)',
            }
          : null),
      },
      style,
    ],
    [borderRadiusValue, marginBottomValue, style, theme.colors.primary, theme.colors.surface, theme.dark]
  );

  // Always render Paper Card as contained to avoid MD3 elevation tint layers.
  // Visual depth is handled explicitly in cardStyle (shadow/border) for consistency.
  const cardMode: 'elevated' | 'outlined' | 'contained' =
    mode === 'outlined' ? 'outlined' : 'contained';

  // Explicitly exclude mode from cardProps to avoid conflicts
  const { mode: _, ...restCardProps } = cardProps as any;

  return (
    <Card mode={cardMode} style={cardStyle} {...restCardProps}>
      {children}
    </Card>
  );
}

