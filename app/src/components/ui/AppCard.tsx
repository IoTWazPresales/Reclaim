import React from 'react';
import { Card } from 'react-native-paper';
import { useAppTheme, type AppTheme } from '@/theme';

type SpacingKey = keyof AppTheme['spacing'];
type BorderRadiusKey = keyof AppTheme['borderRadius'];
type PaperCardProps = React.ComponentProps<typeof Card>;

export interface AppCardProps extends Omit<PaperCardProps, 'style'> {
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
        backgroundColor: theme.colors.surface,
      },
      style,
    ],
    [borderRadiusValue, marginBottomValue, theme.colors.surface, style]
  );

  return (
    <Card mode={mode} style={cardStyle} {...cardProps}>
      {children}
    </Card>
  );
}

