import React from 'react';
import { TextInput, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'number-pad';
  secureTextEntry?: boolean;
  style?: any;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  multiline = false,
  keyboardType = 'default',
  secureTextEntry = false,
  style,
  inputMode,
}: InputProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        inputMode={inputMode}
        style={[styles.input, multiline && styles.multiline, style]}
      />
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    label: {
      marginBottom: 6,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 12,
      padding: 12,
      color: theme.colors.onSurface,
      backgroundColor: theme.colors.surface,
      minHeight: 44,
    },
    multiline: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
  });
}

