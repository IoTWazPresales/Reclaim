import React from 'react';
import { ScrollView, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

type EvidenceNote = {
  id: string;
  title: string;
  science: string;
  action: string;
};

const NOTES: EvidenceNote[] = [
  {
    id: 'sleep-debt-serotonin',
    title: 'Sleep debt & serotonin tone',
    science:
      'Short sleep reduces slow-wave cycles that help stabilise daytime serotonin activity. Morning light, especially within the first hour of waking, helps reset the serotonin–melatonin loop.',
    action: 'Take a 10–20 minute sunlight walk soon after waking.',
  },
  {
    id: 'dopamine-downshift',
    title: 'Post-stress dopamine dip',
    science:
      'Sustained stress drives high dopamine release followed by a compensatory dip. Small, achievable wins rebuild dopamine tone and restore motivation.',
    action: 'Complete a two-minute quick-win task to rebuild momentum.',
  },
  {
    id: 'circadian-drift',
    title: 'Circadian drift & midpoint shifts',
    science:
      'When sleep midpoints drift later than usual, cortisol and melatonin rhythms misalign. Morning light plus limiting afternoon caffeine helps anchor the body clock.',
    action: 'Get morning light and pause caffeine after 2pm.',
  },
  {
    id: 'low-activity-mood',
    title: 'Movement & beta-endorphins',
    science:
      'Low daily movement lowers beta-endorphin release, reducing natural mood buffering. Brisk walks raise endorphins and boost vagal tone.',
    action: 'Add a 5–10 minute brisk walk or gentle movement break.',
  },
  {
    id: 'med-adherence-drop',
    title: 'Medication steady-state',
    science:
      'Irregular medication timing leads to fluctuating plasma levels, reducing steady-state effects. Attaching doses to an existing habit supports adherence.',
    action: 'Tie your next dose to a reliable part of your routine.',
  },
  {
    id: 'oversleep-inertia',
    title: 'Oversleep & adenosine',
    science:
      'Oversleeping can leave adenosine uncleared and delay cortisol rise, triggering groggy inertia. Cold water and outdoor light accelerate the wake transition.',
    action: 'Splash cool water on your face and get three minutes of outdoor light.',
  },
  {
    id: 'social-buffering',
    title: 'Social buffering & oxytocin',
    science:
      'Supportive contact releases oxytocin and calms limbic activity during mood dips. Even micro check-ins help stabilise affect.',
    action: 'Send a short check-in message or voice note to someone you trust.',
  },
  {
    id: 'vagal-tone-breath',
    title: 'Vagal tone & paced breathing',
    science:
      'Stress plus short sleep drives sympathetic dominance and dampens vagal tone. 4-7-8 style breathing raises vagal activity and lowers heart rate.',
    action: 'Try three gentle rounds of 4-7-8 breathing.',
  },
];

export default function EvidenceNotesScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      style={{ backgroundColor: theme.colors.background }}
    >
      <Text variant="headlineSmall" style={{ marginBottom: 8 }}>
        Evidence notes
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
        These quick references summarise why each insight nudge appears. They are informational only and never
        replace clinical guidance.
      </Text>

      {NOTES.map((note) => (
        <Card key={note.id} mode="elevated" style={{ marginBottom: 16, borderRadius: 20 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 6 }}>
              {note.title}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {note.science}
            </Text>
            <View style={{ marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: theme.colors.secondaryContainer }}>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSecondaryContainer, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Suggested nudge
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSecondaryContainer, marginTop: 4 }}>
                {note.action}
              </Text>
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}


