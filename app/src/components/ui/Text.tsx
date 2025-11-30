import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useAppTheme } from '@/theme';

interface TextProps {
  children: React.ReactNode;
  variant?: 'heading' | 'subheading' | 'body' | 'caption';
  style?: any;
}

export function Text({ children, variant = 'body', style }: TextProps) {
  const theme = useAppTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  return <RNText style={[styles.base, styles[variant], style]}>{children}</RNText>;
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    base: {
      color: theme.colors.onSurface,
    },
    heading: {
      ...theme.typography.h2,
      marginBottom: theme.spacing.sm,
    },
    subheading: {
      ...theme.typography.h3,
      marginBottom: theme.spacing.xs,
    },
    body: {
      ...theme.typography.body,
    },
    caption: {
      ...theme.typography.caption,
      opacity: 0.7,
    },
  });
}

