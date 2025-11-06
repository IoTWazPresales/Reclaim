import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';

interface TextProps {
  children: React.ReactNode;
  variant?: 'heading' | 'subheading' | 'body' | 'caption';
  style?: any;
}

export function Text({ children, variant = 'body', style }: TextProps) {
  return <RNText style={[styles.base, styles[variant], style]}>{children}</RNText>;
}

const styles = StyleSheet.create({
  base: {
    color: '#111827',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    opacity: 0.7,
  },
});

