import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useAppTheme } from '@/theme';

export interface TypographyProps extends Omit<TextProps, 'style'> {
  children: React.ReactNode;
  style?: TextProps['style'];
  color?: 'primary' | 'secondary' | 'onSurface' | 'onSurfaceVariant' | 'error' | 'onPrimary';
}

/**
 * Heading1 - Large heading text
 */
export function Heading1({ children, style, color = 'onSurface', ...props }: TypographyProps) {
  const theme = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        text: {
          ...theme.typography.h1,
          color: theme.colors[color],
        },
      }),
    [theme, color]
  );
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
}

/**
 * Heading2 - Medium heading text
 */
export function Heading2({ children, style, color = 'onSurface', ...props }: TypographyProps) {
  const theme = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        text: {
          ...theme.typography.h2,
          color: theme.colors[color],
        },
      }),
    [theme, color]
  );
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
}

/**
 * Heading3 - Small heading text
 */
export function Heading3({ children, style, color = 'onSurface', ...props }: TypographyProps) {
  const theme = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        text: {
          ...theme.typography.h3,
          color: theme.colors[color],
        },
      }),
    [theme, color]
  );
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
}

/**
 * Body - Standard body text
 */
export function Body({ children, style, color = 'onSurface', ...props }: TypographyProps) {
  const theme = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        text: {
          ...theme.typography.body,
          color: theme.colors[color],
        },
      }),
    [theme, color]
  );
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
}

/**
 * Caption - Small caption text
 */
export function Caption({ children, style, color = 'onSurfaceVariant', ...props }: TypographyProps) {
  const theme = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        text: {
          ...theme.typography.caption,
          color: theme.colors[color],
        },
      }),
    [theme, color]
  );
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
}

/**
 * Small - Very small text
 */
export function Small({ children, style, color = 'onSurfaceVariant', ...props }: TypographyProps) {
  const theme = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        text: {
          ...theme.typography.small,
          color: theme.colors[color],
        },
      }),
    [theme, color]
  );
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
}

/**
 * SectionTitle - Standardized section title
 */
export function SectionTitle({ children, style, ...props }: TypographyProps) {
  const theme = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        text: {
          ...theme.typography.h3,
          color: theme.colors.onSurface,
          marginBottom: theme.spacing.md,
        },
      }),
    [theme]
  );
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
}

