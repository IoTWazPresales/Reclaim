import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, Modal, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import type { FeedbackIssueCategory, FeedbackScopeInput, FeedbackSeverity } from '@/lib/feedback/types';

type ReportIssueModalProps = {
  visible: boolean;
  routeName: string | null;
  scope: FeedbackScopeInput | null;
  submitting: boolean;
  onDismiss: () => void;
  onSubmit: (draft: {
    category: FeedbackIssueCategory;
    severity: FeedbackSeverity;
    note: string;
  }) => Promise<void>;
};

const CATEGORIES: Array<{ id: FeedbackIssueCategory; label: string }> = [
  { id: 'visual', label: 'Visual' },
  { id: 'copy', label: 'Copy/Text' },
  { id: 'wrong_data', label: 'Wrong data' },
  { id: 'duplicate_message', label: 'Repeated message' },
  { id: 'performance', label: 'Performance' },
  { id: 'other', label: 'Other' },
];

const SEVERITIES: Array<{ id: FeedbackSeverity; label: string }> = [
  { id: 'minor', label: 'Minor' },
  { id: 'major', label: 'Major' },
  { id: 'critical', label: 'Critical' },
];

export function ReportIssueModal({
  visible,
  routeName,
  scope,
  submitting,
  onDismiss,
  onSubmit,
}: ReportIssueModalProps) {
  const theme = useTheme();
  const [category, setCategory] = useState<FeedbackIssueCategory>('visual');
  const [severity, setSeverity] = useState<FeedbackSeverity>('minor');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setCategory('visual');
    setSeverity('minor');
    setNote('');
  }, [visible, scope?.componentKey, scope?.scopeType]);

  const targetLabel = useMemo(() => {
    const title = scope?.componentTitle?.trim();
    if (title) return title;
    if (scope?.scopeType === 'screen') return routeName ?? 'Current screen';
    return scope?.componentKey ?? 'Current section';
  }, [scope?.componentTitle, scope?.componentKey, scope?.scopeType, routeName]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          marginHorizontal: 14,
        }}
      >
        <Card mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>
              Report issue
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
              Target: {targetLabel}
              {routeName ? ` • ${routeName}` : ''}
            </Text>

            <View style={{ marginTop: 14 }}>
              <Text variant="labelMedium" style={{ marginBottom: 8 }}>
                Category
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((item) => (
                  <Chip
                    key={item.id}
                    selected={category === item.id}
                    onPress={() => setCategory(item.id)}
                    mode="outlined"
                    compact
                  >
                    {item.label}
                  </Chip>
                ))}
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text variant="labelMedium" style={{ marginBottom: 8 }}>
                Severity
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {SEVERITIES.map((item) => (
                  <Chip
                    key={item.id}
                    selected={severity === item.id}
                    onPress={() => setSeverity(item.id)}
                    mode="outlined"
                    compact
                  >
                    {item.label}
                  </Chip>
                ))}
              </View>
            </View>

            <TextInput
              mode="outlined"
              multiline
              numberOfLines={4}
              maxLength={500}
              label="What looks wrong?"
              placeholder="Example: Color is off, message repeats, wrong value shown."
              value={note}
              onChangeText={setNote}
              style={{ marginTop: 14 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <Button mode="text" onPress={onDismiss} disabled={submitting}>
                Cancel
              </Button>
              <Button
                mode="contained"
                loading={submitting}
                disabled={submitting || note.trim().length < 3}
                onPress={() => onSubmit({ category, severity, note: note.trim() })}
              >
                Submit
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
}
