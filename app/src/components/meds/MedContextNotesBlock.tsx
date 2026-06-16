import React from 'react';
import { View, Text } from 'react-native';
import type { MD3Theme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { confidenceLabel, type MedContextNote } from '@/lib/medIntelligence';
import { MedSectionCard } from './MedSectionCard';
import { EMPTY_CONTEXT_NOTES_COPY } from './medDetailPresentation';

function humanizeReasons(reasons: string[]): string {
  return reasons
    .map((r) => {
      if (r === 'stress_flag') return 'stress';
      if (r === 'stress_tag_present') return 'stress tags';
      if (r === 'mood_latest_low') return 'low mood';
      if (r === 'mood_trend_down') return 'mood trend';
      if (r === 'sleep_lastNight_low') return 'last night sleep';
      if (r === 'sleep_avg7d_low') return 'recent sleep';
      if (r === 'adherence_low') return 'adherence';
      if (r === 'missed_doses_recent') return 'missed doses';
      return r;
    })
    .join(', ');
}

export type MedContextNotesBlockProps = {
  contextNotes: MedContextNote[];
  theme: MD3Theme;
  appTheme: ReturnType<typeof useAppTheme>;
};

export function MedContextNotesBlock({ contextNotes, theme, appTheme }: MedContextNotesBlockProps) {
  return (
    <MedSectionCard
      title="Why this may matter today"
      subtitle="Pattern-based notes — not medical advice."
      theme={theme}
      appTheme={appTheme}
    >
      {contextNotes.length === 0 ? (
        <Text style={{ marginTop: 8, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
          {EMPTY_CONTEXT_NOTES_COPY}
        </Text>
      ) : (
        <View style={{ marginTop: 8 }}>
          {contextNotes.map((note) => {
            const reasonsHumanized = humanizeReasons(note.reasons);
            return (
              <View
                key={note.id}
                style={{ marginTop: 8, padding: 10, backgroundColor: theme.colors.surfaceVariant, borderRadius: 8 }}
              >
                <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{note.title}</Text>
                <Text style={{ marginTop: 4, opacity: 0.9, color: theme.colors.onSurface }}>{note.message}</Text>
                <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 11, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>
                    Confidence: {confidenceLabel(note.confidence)}
                  </Text>
                  {reasonsHumanized ? (
                    <Text style={{ fontSize: 11, opacity: 0.6, color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
                      • Based on: {reasonsHumanized}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </MedSectionCard>
  );
}
