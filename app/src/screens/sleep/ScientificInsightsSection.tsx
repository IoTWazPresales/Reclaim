import React from 'react';
import { View, Text } from 'react-native';
import { Card, useTheme } from 'react-native-paper';

type SleepSessionLite = {
  startTime?: string;
  endTime?: string;
  durationMin?: number;
  stages?: Array<{ stage?: string }>;
};

type InsightCard = { id: string; title: string; body: string };

function avgDurationMinutes(sessions: SleepSessionLite[]): number | null {
  const vals = sessions
    .map((s) => s.durationMin)
    .filter((v): v is number => typeof v === 'number' && isFinite(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function buildScientificInsights(params: {
  latestSession?: SleepSessionLite | null;
  rangeSessions?: SleepSessionLite[];
}): InsightCard[] {
  const { latestSession, rangeSessions = [] } = params;
  const cards: InsightCard[] = [];
  const latestDur = latestSession?.durationMin ?? null;
  const avgDur = avgDurationMinutes(rangeSessions);

  const push = (id: string, title: string, body: string) => cards.push({ id, title, body });

  push(
    'adenosine',
    'Adenosine & sleep pressure',
    'As adenosine builds across the day, your brain pushes for sleep. Caffeine blocks this signal temporarily, but if sleep is short or fragmented you can feel “wired but tired.” Keep caffeine earlier in the day and aim for a consistent wind-down to let adenosine do its job.'
  );

  push(
    'cortisol',
    'Cortisol awakening response',
    'A predictable wake time helps your cortisol rise in the morning, giving alertness without a big spike later. If wake time drifts, cortisol can surge at the wrong time, making energy feel erratic. Anchor your wake time first; bedtime will follow.'
  );

  push(
    'dopamine',
    'Dopamine & impulse control',
    'Poor or short sleep reduces dopamine sensitivity, which can drive cravings and impulsive decisions. Protect the first half of the night for deep sleep—screens and bright light near bedtime can delay this phase.'
  );

  push(
    'serotonin',
    'Serotonin & mood stability',
    'Fragmented sleep can lower serotonin availability, increasing irritability and anxiety. A steady pre-bed routine, lower evening light, and consistent wake time can reduce fragmentation and stabilize mood.'
  );

  push(
    'melatonin',
    'Melatonin & light timing',
    'Bright light and screens late at night suppress melatonin, pushing sleep onset later. Dim lights 60–90 minutes before bed and avoid bright screens pointed at your eyes to help melatonin rise.'
  );

  if (avgDur !== null && avgDur < 390) {
    push(
      'rem',
      'REM & emotional processing',
      'Short sleep cuts into REM, which is concentrated in the latter part of the night. Less REM can mean more emotional volatility the next day. Protect the last 1–2 hours by keeping wake-up consistent and buffering alarms with a calm routine.'
    );
  }

  if (latestDur !== null && latestDur < 360) {
    push(
      'deep',
      'Deep sleep & recovery',
      'Deep sleep early in the night is key for physical recovery and immune health. Short nights trim this stage. Keep late caffeine/alcohol low and allow enough time in bed so the first sleep cycles stay intact.'
    );
  }

  return cards.slice(0, 5);
}

export function ScientificInsightsSection({
  insights,
}: {
  insights: InsightCard[];
}) {
  const theme = useTheme();
  if (!insights.length) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: theme.colors.onSurface, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
        Scientific insights
      </Text>
      {insights.map((insight) => (
        <Card
          key={insight.id}
          mode="elevated"
          style={{ marginBottom: 12, borderRadius: 16, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 6 }}>
              {insight.title}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
              {insight.body}
            </Text>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}


