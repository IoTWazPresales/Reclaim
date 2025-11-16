import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  style?: any;
}

export function Button({ children, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  const theme = useTheme();
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

function makeStyles(theme: any) {
  return StyleSheet.create({
    button: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
    },
    outline: {
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
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

