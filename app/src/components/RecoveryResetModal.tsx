/**
 * Recovery Reset Modal
 * Allows users to reset recovery plan with week selection and recovery type
 */
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import * as Paper from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import type { RecoveryType } from '@/lib/recovery';

type RecoveryResetModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (week: number, recoveryType: RecoveryType, custom?: string) => void;
  currentWeek?: number;
  currentRecoveryType?: RecoveryType;
  currentCustom?: string;
};

const RECOVERY_TYPE_OPTIONS: Array<{ value: RecoveryType; label: string }> = [
  { value: null, label: 'General Recovery' },
  { value: 'substance', label: 'Substance Recovery' },
  { value: 'exhaustion', label: 'Exhaustion/Burnout Recovery' },
  { value: 'mental_breakdown', label: 'Mental Health Recovery' },
  { value: 'other', label: 'Other' },
];

const { Portal, Card, Text, Button, TextInput, useTheme } = Paper;
const PaperModal = (Paper as any).Modal;
const PaperRadioButton = (Paper as any).RadioButton;

export function RecoveryResetModal({
  visible,
  onDismiss,
  onConfirm,
  currentWeek = 1,
  currentRecoveryType = null,
  currentCustom = '',
}: RecoveryResetModalProps) {
  const theme = useTheme();
  const [week, setWeek] = useState<number>(currentWeek);
  const [recoveryType, setRecoveryType] = useState<RecoveryType>(currentRecoveryType ?? null);
  const [customType, setCustomType] = useState<string>(currentCustom ?? '');

  const handleConfirm = () => {
    onConfirm(week, recoveryType, recoveryType === 'other' ? customType : undefined);
    onDismiss();
  };

  return (
    <Portal>
      <PaperModal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        accessibilityViewIsModal
        accessibilityLabel="Reset recovery plan"
      >
        <Card mode="elevated" style={styles.card}>
          <Card.Title title="Reset Recovery Plan" accessibilityRole="header" />
          <Card.Content>
            <ScrollView style={styles.scrollView}>
              <Text variant="bodyMedium" style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
                Reset your recovery progress and optionally set your current week and recovery type.
              </Text>

              {/* Week Selection */}
              <View style={styles.section}>
                <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.onSurface }}>
                  Current Week
                </Text>
                <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surfaceVariant }]} accessibilityRole="combobox" accessibilityLabel="Select current week">
                  <Picker
                    selectedValue={week}
                    onValueChange={(value) => setWeek(value)}
                    style={{ color: theme.colors.onSurface }}
                    accessibilityLabel={`Current week: Week ${week}`}
                  >
                    {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                      <Picker.Item key={w} label={`Week ${w}`} value={w} />
                    ))}
                  </Picker>
                </View>
                <Text variant="bodySmall" style={{ marginTop: 4, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>
                  Select the week you're currently on in your recovery journey.
                </Text>
              </View>

              {/* Recovery Type Selection */}
              <View style={styles.section}>
                <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.onSurface }}>
                  Recovery Type (Optional)
                </Text>
                {RECOVERY_TYPE_OPTIONS.map((option) => (
                  <View key={option.value ?? 'null'} style={styles.radioRow} accessibilityRole="radio" accessibilityState={{ checked: recoveryType === option.value }}>
                    <PaperRadioButton
                      value={option.value ?? 'null'}
                      status={recoveryType === option.value ? 'checked' : 'unchecked'}
                      onPress={() => setRecoveryType(option.value)}
                      accessibilityLabel={option.label}
                    />
                    <Text
                      variant="bodyMedium"
                      onPress={() => setRecoveryType(option.value)}
                      style={{ flex: 1, color: theme.colors.onSurface }}
                      accessibilityRole="text"
                    >
                      {option.label}
                    </Text>
                  </View>
                ))}
                {recoveryType === 'other' && (
                  <TextInput
                    label="Custom Recovery Type"
                    value={customType}
                    onChangeText={setCustomType}
                    mode="outlined"
                    style={{ marginTop: 8 }}
                    placeholder="Describe your recovery type..."
                    accessibilityLabel="Enter custom recovery type description"
                    accessibilityRole="text"
                  />
                )}
                <Text variant="bodySmall" style={{ marginTop: 4, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>
                  Select what you're recovering from for a more tailored experience.
                </Text>
              </View>
            </ScrollView>
          </Card.Content>
          <Card.Actions style={styles.actions}>
            <Button onPress={onDismiss} accessibilityLabel="Cancel reset recovery plan">Cancel</Button>
            <Button mode="contained" onPress={handleConfirm} accessibilityLabel="Reset recovery plan and start fresh">
              Reset & Start Fresh
            </Button>
          </Card.Actions>
        </Card>
      </PaperModal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    maxHeight: '80%',
  },
  card: {
    borderRadius: 20,
  },
  scrollView: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 24,
  },
  pickerContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  actions: {
    padding: 16,
    justifyContent: 'flex-end',
  },
});

