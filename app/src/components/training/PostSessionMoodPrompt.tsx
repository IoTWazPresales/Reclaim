// Post Session Mood Prompt - Collect user feeling after workout
import React, { useState } from 'react';
import { View } from 'react-native';
import { Modal, Portal, Text, Button, Card, useTheme, Chip } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { createPostSessionCheckin } from '@/lib/api';
import { logger } from '@/lib/logger';

interface PostSessionMoodPromptProps {
  visible: boolean;
  sessionId: string;
  onComplete: () => void;
}

const MOOD_OPTIONS = [
  { value: 'energized', label: 'Energized', icon: '⚡' },
  { value: 'proud', label: 'Proud', icon: '💪' },
  { value: 'accomplished', label: 'Accomplished', icon: '✅' },
  { value: 'neutral', label: 'Neutral', icon: '😐' },
  { value: 'drained', label: 'Drained', icon: '😮‍💨' },
  { value: 'frustrated', label: 'Frustrated', icon: '😤' },
];

export default function PostSessionMoodPrompt({ visible, sessionId, onComplete }: PostSessionMoodPromptProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;

    setSubmitting(true);
    try {
      await createPostSessionCheckin(sessionId, selected);
      onComplete();
    } catch (error: any) {
      logger.warn('Failed to save post-session check-in', error);
      // Don't block - just close
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleSkip}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          margin: appTheme.spacing.lg,
          borderRadius: appTheme.borderRadius.xl,
        }}
      >
        <View style={{ padding: appTheme.spacing.lg }}>
          <FeatureCardHeader icon="emoticon-happy-outline" title="How do you feel?" />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.sm, marginBottom: appTheme.spacing.lg }}>
            Quick check-in after your session
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm, marginBottom: appTheme.spacing.lg }}>
            {MOOD_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={selected === option.value}
                onPress={() => setSelected(option.value)}
                style={{ minWidth: 100 }}
              >
                {option.icon} {option.label}
              </Chip>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: appTheme.spacing.md }}>
            <Button mode="outlined" onPress={handleSkip} style={{ flex: 1 }} disabled={submitting}>
              Skip
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={{ flex: 1 }}
              disabled={!selected || submitting}
              loading={submitting}
            >
              Save
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}
