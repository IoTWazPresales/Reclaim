import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

interface CardProps {
  children: React.ReactNode;
  style?: any;
}

export function Card({ children, style }: CardProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  return <View style={[styles.card, style]}>{children}</View>;
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      backgroundColor: theme.colors.surface,
    },
  });
}

