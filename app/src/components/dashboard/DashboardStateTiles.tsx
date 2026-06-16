import React from 'react';
import { View } from 'react-native';

import { Reveal } from '@/components/motion/Reveal';
import {
  HomeDashboardTile,
  MoodRhythmVisual,
  PredictionRibbonVisual,
  SleepHypnoMiniVisual,
  TrainingWeekRailVisual,
  type MoodDot,
  type TrainingRailCell,
} from '@/components/dashboard/HomeDashboardTile';

type ForecastTone = '+' | '~' | '-';

export type DashboardStateTilesProps = {
  sectionGap: number;
  tileRowGap: number;
  reduceMotion: boolean;
  isDark: boolean;
  stateForecast: {
    headline: string;
    tone: ForecastTone;
    confidence: number;
  };
  predictionTileSubline: string;
  onPredictionPress: () => void;
  sleepQualityHeadline: string;
  sleepTileSubline: string;
  sleepTileHypnogram: Array<{
    key: string;
    leftPct: number;
    widthPct: number;
    y: number;
    color: string;
    stage: string;
  }>;
  onSleepPress: () => void;
  moodTileHeadline: string;
  moodTileSubline: string;
  moodWeekDots: MoodDot[];
  moodTileVisualGlow?: string;
  onMoodPress: () => void;
  trainingTileHeadline: string;
  trainingTileSubline: string;
  trainingWeekRailCells: TrainingRailCell[];
  onTrainingPress: () => void;
};

export function DashboardStateTiles({
  sectionGap,
  tileRowGap,
  reduceMotion,
  isDark,
  stateForecast,
  predictionTileSubline,
  onPredictionPress,
  sleepQualityHeadline,
  sleepTileSubline,
  sleepTileHypnogram,
  onSleepPress,
  moodTileHeadline,
  moodTileSubline,
  moodWeekDots,
  moodTileVisualGlow,
  onMoodPress,
  trainingTileHeadline,
  trainingTileSubline,
  trainingWeekRailCells,
  onTrainingPress,
}: DashboardStateTilesProps) {
  const rowStyle = {
    flexDirection: 'row' as const,
    gap: tileRowGap,
    alignItems: 'stretch' as const,
  };

  return (
    <View style={{ marginBottom: sectionGap, gap: tileRowGap }}>
      <Reveal delay={0} style={rowStyle}>
        <HomeDashboardTile
          accent="prediction"
          label="Prediction"
          headline={stateForecast.headline}
          subline={predictionTileSubline}
          onPress={onPredictionPress}
          reduceMotion={reduceMotion}
          accessibilityLabel="Prediction. Open forecast details."
          visual={
            <PredictionRibbonVisual
              tone={stateForecast.tone}
              confidence={stateForecast.confidence}
              dark={isDark}
            />
          }
        />
        <HomeDashboardTile
          accent="sleep"
          label="Last night"
          headline={sleepQualityHeadline}
          subline={sleepTileSubline}
          onPress={onSleepPress}
          reduceMotion={reduceMotion}
          accessibilityLabel="Last night sleep. Open snapshot."
          visual={<SleepHypnoMiniVisual segments={sleepTileHypnogram} dark={isDark} />}
        />
      </Reveal>

      <Reveal delay={70} style={rowStyle}>
        <HomeDashboardTile
          accent="mood"
          label="Mood"
          headline={moodTileHeadline}
          subline={moodTileSubline}
          onPress={onMoodPress}
          reduceMotion={reduceMotion}
          accessibilityLabel="Mood. Quick check-in."
          visual={<MoodRhythmVisual dots={moodWeekDots} dark={isDark} zoneTint={moodTileVisualGlow} />}
        />
        <HomeDashboardTile
          accent="training"
          label="Training"
          headline={trainingTileHeadline}
          subline={trainingTileSubline}
          onPress={onTrainingPress}
          reduceMotion={reduceMotion}
          accessibilityLabel="Training. Open training tab."
          visual={<TrainingWeekRailVisual cells={trainingWeekRailCells} dark={isDark} />}
        />
      </Reveal>
    </View>
  );
}
