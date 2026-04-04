import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { ReclaimButton } from '@/components/ui/ReclaimButton';
import { useAppTheme } from '@/theme';
import {
  reclaimGuidedActionCardShell,
  RECLAIM_CARD_BLOCK_GAP,
} from '@/theme/reclaimVisualLanguage';
import { reclaimTextRoles } from '@/theme/reclaimTypography';

type SchedulingCardProps = {
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionDisabled?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionDisabled?: boolean;
  tertiaryActionLabel?: string;
  onTertiaryAction?: () => void;
  tertiaryActionDisabled?: boolean;
};

export function SchedulingCard({
  title,
  subtitle,
  status,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionDisabled,
  tertiaryActionLabel,
  onTertiaryAction,
  tertiaryActionDisabled,
}: SchedulingCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const shell = useMemo(() => reclaimGuidedActionCardShell(appTheme), [appTheme]);

  return (
    <Card mode="elevated" style={shell}>
      <Card.Content style={{ paddingVertical: 14 }}>
        <Text variant="titleSmall" style={[reclaimTextRoles.sectionTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant="bodySmall"
            style={[reclaimTextRoles.meta, { marginTop: 6, color: theme.colors.onSurfaceVariant }]}
          >
            {subtitle}
          </Text>
        ) : null}
        {status ? <View style={{ marginTop: RECLAIM_CARD_BLOCK_GAP }}>{status}</View> : null}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: 12,
            columnGap: 12,
            rowGap: 12,
          }}
        >
          <ReclaimButton
            variant="primary"
            onPress={onPrimaryAction}
            accessibilityLabel={primaryActionLabel}
            disabled={primaryActionDisabled}
          >
            {primaryActionLabel}
          </ReclaimButton>
          {secondaryActionLabel && onSecondaryAction ? (
            <ReclaimButton
              variant="tertiary"
              onPress={onSecondaryAction}
              accessibilityLabel={secondaryActionLabel}
              disabled={secondaryActionDisabled}
            >
              {secondaryActionLabel}
            </ReclaimButton>
          ) : null}
          {tertiaryActionLabel && onTertiaryAction ? (
            <ReclaimButton
              variant="ghost"
              onPress={onTertiaryAction}
              accessibilityLabel={tertiaryActionLabel}
              disabled={tertiaryActionDisabled}
            >
              {tertiaryActionLabel}
            </ReclaimButton>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}
