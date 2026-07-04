import React from 'react';
import { View } from 'react-native';

import { Reveal } from '@/components/motion/Reveal';
import { useAppTheme } from '@/theme';
import { homeTileDomainAccent } from '@/theme/dashboardHomeTiles';
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
  predictionEmpty?: boolean;
  onPredictionPress: () => void;
  sleepQualityHeadline: string;
  sleepTileSubline: string;
  sleepEmpty?: boolean;
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
  moodEmpty?: boolean;
  moodWeekDots: MoodDot[];
  moodTileVisualGlow?: string;
  onMoodPress: () => void;
  trainingTileHeadline: string;
  trainingTileSubline: string;
  trainingEmpty?: boolean;
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
  predictionEmpty = false,
  onPredictionPress,
  sleepQualityHeadline,
  sleepTileSubline,
  sleepEmpty = false,
  sleepTileHypnogram,
  onSleepPress,
  moodTileHeadline,
  moodTileSubline,
  moodEmpty = false,
  moodWeekDots,
  moodTileVisualGlow,
  onMoodPress,
  trainingTileHeadline,
  trainingTileSubline,
  trainingEmpty = false,
  trainingWeekRailCells,
  onTrainingPress,
}: DashboardStateTilesProps) {
  const appTheme = useAppTheme();
  const predictionAccent = homeTileDomainAccent('prediction', appTheme.domainAccents);
  const sleepAccent = homeTileDomainAccent('sleep', appTheme.domainAccents);
  const moodAccent = homeTileDomainAccent('mood', appTheme.domainAccents);
  const trainingAccent = homeTileDomainAccent('training', appTheme.domainAccents);

  const rowStyle = {
    flexDirection: 'row' as const,
    gap: tileRowGap,
    alignItems: 'stretch' as const,
  };

  const sleepHasData = sleepTileHypnogram.length > 0;

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
          isEmpty={predictionEmpty}
          accessibilityLabel="Prediction. Open forecast details."
          visual={
            <PredictionRibbonVisual
              tone={stateForecast.tone}
              confidence={stateForecast.confidence}
              dark={isDark}
              accent={predictionAccent}
              reduceMotion={reduceMotion}
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
          isEmpty={sleepEmpty}
          accessibilityLabel="Last night sleep. Open snapshot."
          visual={
            <SleepHypnoMiniVisual
              segments={sleepTileHypnogram}
              dark={isDark}
              accent={sleepAccent}
              skeleton={!sleepHasData}
            />
          }
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
          isEmpty={moodEmpty}
          accessibilityLabel="Mood. Quick check-in."
          visual={
            <MoodRhythmVisual
              dots={moodWeekDots}
              dark={isDark}
              zoneTint={moodTileVisualGlow}
              accent={moodAccent}
              skeleton={moodEmpty}
            />
          }
        />
        <HomeDashboardTile
          accent="training"
          label="Training"
          headline={trainingTileHeadline}
          subline={trainingTileSubline}
          onPress={onTrainingPress}
          reduceMotion={reduceMotion}
          isEmpty={trainingEmpty}
          accessibilityLabel="Training. Open training tab."
          visual={
            <TrainingWeekRailVisual
              cells={trainingWeekRailCells}
              dark={isDark}
              accent={trainingAccent}
              skeleton={trainingEmpty}
            />
          }
        />
      </Reveal>
    </View>
  );
}
