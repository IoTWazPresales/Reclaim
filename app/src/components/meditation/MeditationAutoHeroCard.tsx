import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loadMeditationSettings, type MeditationAutoRule } from '@/lib/meditationSettings';
import { describeAutoRule, formatNextScheduledLabel } from '@/lib/meditation/nextAutoMeditationLabel';

type Props = {
  onPlay: (rule: MeditationAutoRule | null) => void;
  cardSurface: string;
  sectionSpacing: number;
};

async function loadPrimaryRuleAndLabel(): Promise<{ rule: MeditationAutoRule | null; nextLabel: string }> {
  const settings = await loadMeditationSettings();
  const fixed = settings.rules.find((r) => r.mode === 'fixed_time');
  const rule = fixed ?? settings.rules.find((r) => r.mode === 'after_wake') ?? settings.rules[0] ?? null;
  const nextLabel = await formatNextScheduledLabel(rule);
  return { rule, nextLabel };
}

export function MeditationAutoHeroCard({ onPlay, cardSurface, sectionSpacing }: Props) {
  const theme = useTheme();
  const [primaryRule, setPrimaryRule] = useState<MeditationAutoRule | null>(null);
  const [nextLabel, setNextLabel] = useState('Loading schedule…');

  const refreshSchedule = useCallback(() => {
    let mounted = true;
    (async () => {
      try {
        const { rule, nextLabel: label } = await loadPrimaryRuleAndLabel();
        if (!mounted) return;
        setPrimaryRule(rule);
        setNextLabel(label);
      } catch {
        if (!mounted) return;
        setPrimaryRule(null);
        setNextLabel('Set a schedule in Mindfulness → Auto meditation');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(refreshSchedule);

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
