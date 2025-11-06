import React from 'react';
import { TextInput, StyleSheet, Text, View } from 'react-native';

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
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        inputMode={inputMode}
        style={[styles.input, multiline && styles.multiline, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    color: '#111827',
    backgroundColor: '#ffffff',
    minHeight: 44,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
});

