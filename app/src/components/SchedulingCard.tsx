import React from 'react';
import { View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';

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

  return (
    <Card mode="elevated" style={{ borderRadius: 16, backgroundColor: theme.colors.surface }}>
      <Card.Content>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        ) : null}
        {status ? <View style={{ marginTop: 8 }}>{status}</View> : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, columnGap: 12, rowGap: 12 }}>
          <Button
            mode="contained"
            onPress={onPrimaryAction}
            accessibilityLabel={primaryActionLabel}
            disabled={primaryActionDisabled}
          >
            {primaryActionLabel}
          </Button>
          {secondaryActionLabel && onSecondaryAction ? (
            <Button
              mode="outlined"
              onPress={onSecondaryAction}
              accessibilityLabel={secondaryActionLabel}
              disabled={secondaryActionDisabled}
            >
              {secondaryActionLabel}
            </Button>
          ) : null}
          {tertiaryActionLabel && onTertiaryAction ? (
            <Button
              mode="text"
              onPress={onTertiaryAction}
              accessibilityLabel={tertiaryActionLabel}
              disabled={tertiaryActionDisabled}
            >
              {tertiaryActionLabel}
            </Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}
