import React from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

import { InformationalCard } from '@/components/ui';
import type { reclaimGhostCapsuleButton } from '@/theme/reclaimVisualLanguage';

type CapsuleButtonStyles = ReturnType<typeof reclaimGhostCapsuleButton>;

type DashboardPostOnboardingGuideProps = {
  visible: boolean;
  sectionGap: number;
  primaryCapsule: CapsuleButtonStyles;
  ghostCapsule: CapsuleButtonStyles;
  onOpenMindfulness: () => void;
  onDismiss: () => void;
};

export function DashboardPostOnboardingGuide({
  visible,
  sectionGap,
  primaryCapsule,
  ghostCapsule,
  onOpenMindfulness,
  onDismiss,
}: DashboardPostOnboardingGuideProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View style={{ marginBottom: sectionGap }}>
      <InformationalCard icon="compass-outline">
        <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
          Start on Home
        </Text>
        <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
          Your daily read is the <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>Daily signal</Text>{' '}
          card at the top of Home. Scroll for sleep, mood, and training snapshots — Recovery below helps you stay on track.
        </Text>
        <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
          Mindfulness is optional — short guided resets when you want them.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, alignItems: 'center' }}>
          <Button
            mode="contained"
            onPress={onOpenMindfulness}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            style={primaryCapsule.style}
            contentStyle={[primaryCapsule.contentStyle, { minHeight: 46, paddingHorizontal: 18 }]}
            labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
          >
            Open Mindfulness
          </Button>
          <Button
            mode="text"
            onPress={onDismiss}
            textColor={theme.colors.primary}
            style={ghostCapsule.style}
            contentStyle={ghostCapsule.contentStyle}
            labelStyle={ghostCapsule.labelStyle}
          >
            Got it
          </Button>
        </View>
      </InformationalCard>
    </View>
  );
}
