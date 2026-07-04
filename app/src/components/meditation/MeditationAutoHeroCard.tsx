import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loadMeditationSettings, type MeditationAutoRule } from '@/lib/meditationSettings';
import { describeAutoRule, formatNextScheduledLabel } from '@/lib/meditation/nextAutoMeditationLabel';

type Props = {
  onPlay: (rule: MeditationAutoRule | null) => void;
  cardSurface: string;
  sectionSpacing: number;
};

export function MeditationAutoHeroCard({ onPlay, cardSurface, sectionSpacing }: Props) {
  const theme = useTheme();
  const [primaryRule, setPrimaryRule] = useState<MeditationAutoRule | null>(null);
  const [nextLabel, setNextLabel] = useState('Loading schedule…');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const settings = await loadMeditationSettings();
      const rule = settings.rules.find((r) => r.mode === 'after_wake') ?? settings.rules[0] ?? null;
      if (!mounted) return;
      setPrimaryRule(rule);
      setNextLabel(await formatNextScheduledLabel(rule));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const headline = primaryRule
    ? `Default auto meditation — ${describeAutoRule(primaryRule)}`
    : 'Default auto meditation — not configured yet';

  return (
    <Card mode="elevated" style={{ borderRadius: 20, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
      <Card.Content>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', lineHeight: 22 }}>
          {headline}
        </Text>
        <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
          {nextLabel}
        </Text>
        <Pressable
          onPress={() => onPlay(primaryRule)}
          accessibilityRole="button"
          accessibilityLabel="Start default auto meditation"
          style={{
            marginTop: 16,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 999,
            backgroundColor: theme.colors.primary,
          }}
        >
          <MaterialCommunityIcons name="play" size={28} color={theme.colors.onPrimary} />
          <Text variant="titleMedium" style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
            Play
          </Text>
        </Pressable>
      </Card.Content>
    </Card>
  );
}
