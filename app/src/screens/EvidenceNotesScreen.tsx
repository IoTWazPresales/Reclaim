import React from 'react';
import { ScrollView, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

type EvidenceNote = {
  id: string;
  title: string;
  science: string;
  citation: string;
  action: string;
};

const NOTES: EvidenceNote[] = [
  {
    id: 'sleep-debt-serotonin',
    title: 'Sleep debt & serotonin tone',
    science:
      'Short sleep reduces slow-wave cycles that help stabilise daytime serotonin activity. Morning light, especially within the first hour of waking, helps reset the serotonin\u2013melatonin loop.',
    citation: 'Dijk & Lockley, J. Biol. Rhythms 2002; Wirz-Justice et al., Chronobiol. Int. 2004.',
    action: 'Take a 10\u201320 minute sunlight walk soon after waking.',
  },
  {
    id: 'dopamine-downshift',
    title: 'Post-stress dopamine dip',
    science:
      'Sustained stress drives high dopamine release followed by a compensatory dip. Small, achievable wins rebuild dopamine tone and restore motivation.',
    citation: 'Schultz, Annu. Rev. Neurosci. 2007; Treadway & Zald, Neurosci. Biobehav. Rev. 2011.',
    action: 'Complete a two-minute quick-win task to rebuild momentum.',
  },
  {
    id: 'circadian-drift',
    title: 'Circadian drift & midpoint shifts',
    science:
      'When sleep midpoints drift later than usual, cortisol and melatonin rhythms misalign. Morning light plus limiting afternoon caffeine helps anchor the body clock.',
    citation: 'Roenneberg et al., Curr. Biol. 2004; Drake et al., J. Clin. Sleep Med. 2013.',
    action: 'Get morning light and pause caffeine after 2pm.',
  },
  {
    id: 'low-activity-mood',
    title: 'Movement & beta-endorphins',
    science:
      'Low daily movement lowers beta-endorphin release, reducing natural mood buffering. Brisk walks raise endorphins and boost vagal tone.',
    citation: 'Dishman & O\u2019Connor, Br. J. Sports Med. 2009; Schuch et al., J. Psychiatr. Res. 2016.',
    action: 'Add a 5\u201310 minute brisk walk or gentle movement break.',
  },
  {
    id: 'med-adherence-drop',
    title: 'Medication steady-state',
    science:
      'Irregular medication timing leads to fluctuating plasma levels, reducing steady-state effects. Attaching doses to an existing habit supports adherence.',
    citation: 'Osterberg & Blaschke, N. Engl. J. Med. 2005; Conn et al., Ann. Behav. Med. 2015.',
    action: 'Tie your next dose to a reliable part of your routine.',
  },
  {
    id: 'oversleep-inertia',
    title: 'Oversleep & adenosine',
    science:
      'Oversleeping can leave adenosine uncleared and delay cortisol rise, triggering groggy inertia. Cold water and outdoor light accelerate the wake transition.',
    citation: 'Trotti, Sleep Med. Rev. 2017; Hilditch & McHill, Nat. Sci. Sleep 2019.',
    action: 'Splash cool water on your face and get three minutes of outdoor light.',
  },
  {
    id: 'social-buffering',
    title: 'Social buffering & oxytocin',
    science:
      'Supportive contact releases oxytocin and calms limbic activity during mood dips. Even micro check-ins help stabilise affect.',
    citation: 'Heinrichs et al., Biol. Psychiatry 2003; Kikusui et al., Neurosci. Biobehav. Rev. 2006.',
    action: 'Send a short check-in message or voice note to someone you trust.',
  },
  {
    id: 'vagal-tone-breath',
    title: 'Vagal tone & paced breathing',
    science:
      'Stress plus short sleep drives sympathetic dominance and dampens vagal tone. 4\u20137\u20138 style breathing raises vagal activity and lowers heart rate.',
    citation: 'Laborde et al., Front. Psychol. 2017; Gerritsen & Band, Front. Hum. Neurosci. 2018.',
    action: 'Try three gentle rounds of 4\u20137\u20138 breathing.',
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
        These quick references summarise why each insight nudge appears. They are informational
        only and are not medical advice. Always consult a qualified healthcare professional before
        making changes to medication, sleep, or exercise routines.
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
            <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 6, fontStyle: 'italic' }}>
              {note.citation}
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

      <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4, marginBottom: 24, textAlign: 'center' }}>
        Citations are provided for educational context. Reclaim is not a medical device and does
        not diagnose, treat, or prevent any condition.
      </Text>
    </ScrollView>
  );
}


