import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/theme';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  style?: any;
}

export function Button({ children, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  const theme = useAppTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const containerStyle = [
    styles.button,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'outline' && styles.outline,
    disabled && styles.disabled,
    style,
  ];
  const textStyle = [
    styles.text,
    variant === 'primary' && styles.textPrimary,
    variant === 'outline' && styles.textOutline,
  ];

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={containerStyle}>
      <Text style={textStyle}>{children}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    button: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: theme.colors.primary,
      elevation: theme.dark ? 3 : 5,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: theme.dark ? 0.32 : 0.22,
      shadowRadius: 10,
      borderWidth: 1,
      borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)',
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      elevation: theme.dark ? 2 : 4,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.dark ? 0.24 : 0.16,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)',
    },
    outline: {
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.dark ? 'rgba(22,32,54,0.82)' : 'rgba(255,255,255,0.86)',
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
      ...theme.typography.body,
      fontWeight: '700',
      color: theme.colors.onPrimary,
    },
    textPrimary: {
      color: theme.colors.onPrimary,
    },
    textOutline: {
      color: theme.colors.onSurface,
    },
  });
}

