// Volume Graph - Show weekly volume by muscle group or intent
import React from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';

interface VolumeGraphProps {
  weeklyVolumes: Array<{ week: number; volume: number }>;
  label: string;
}

export default function VolumeGraph({ weeklyVolumes, label }: VolumeGraphProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  if (weeklyVolumes.length === 0) {
    return (
      <Card mode="outlined" style={{ marginBottom: appTheme.spacing.md }}>
        <Card.Content>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            No volume data available
          </Text>
        </Card.Content>
      </Card>
    );
  }

  const maxVolume = Math.max(...weeklyVolumes.map((w) => w.volume));

  return (
    <Card mode="outlined" style={{ marginBottom: appTheme.spacing.md }}>
      <Card.Content>
        <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
          {label} Weekly Volume
        </Text>
        <View style={{ height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          {weeklyVolumes.map((wv, index) => {
            const height = (wv.volume / maxVolume) * 80 + 20;
            return (
              <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                <View
                  style={{
                    width: '100%',
                    height,
                    backgroundColor: theme.colors.secondary,
                    borderRadius: 2,
                  }}
                />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  W{wv.week}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={{ marginTop: appTheme.spacing.sm }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Total: {weeklyVolumes.reduce((sum, wv) => sum + wv.volume, 0).toFixed(0)}kg
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}
