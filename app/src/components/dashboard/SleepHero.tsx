/**
 * Sleep Hero - rings + moon center, no nodes.
 * Text overlays: title above moon, chip + context below, confidence underneath.
 */

import React, { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Chip, Text, useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { SleepMoonVisualization } from './SleepMoonVisualization';
import { confidenceNextStepForHero } from '@/lib/display/confidenceGuidance';

const DIAGRAM_SIZE = 400;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 20;
const OVERLAY_PADDING_H = 20;

const RING_FAINT = 'rgba(226, 232, 240, 0.12)';
const RING_DASH = 'rgba(226, 232, 240, 0.10)';

const ROT_MS = 28000;

const ORB_WIDTH_RATIO = 0.44;
const ORB_MIN = 140;
const ORB_MAX = 210;

const OUTER_RING_RATIO = 1.32;
const MID_RING_RATIO = 1.08;
const INNER_RING_RATIO = 0.78;

const DASH_A = '3 7';
const DASH_B = '2 10';

export type SleepHeroState = {
  title: string;
  deltas: string[];
  subtitle?: string;
};

function getSleepContextLine(heroState: SleepHeroState | undefined, hasData: boolean): string | null {
  if (!heroState) return null;
  if (heroState.subtitle) return heroState.subtitle;
  return hasData ? 'Based on your latest sleep session.' : null;
}

type SleepHeroProps = {
  durationMin?: number | null;
  targetSleepMinutes?: number;
  efficiency?: number | null;
  quality?: number | null;
  hasData?: boolean;
  heroState?: SleepHeroState;
  confidence?: { label: string; confPct: number };
  trendDaysCount?: number;
};

export function SleepHero({
  durationMin,
  targetSleepMinutes = 480,
  efficiency,
  quality,
  hasData = false,
  heroState,
  confidence,
  trendDaysCount = 0,
}: SleepHeroProps) {
  const theme = useTheme();
  const { width } = Dimensions.get('window');
  const diagramWidth = Math.min(width, DIAGRAM_SIZE);

  const orbSize = Math.min(ORB_MAX, Math.max(ORB_MIN, diagramWidth * ORB_WIDTH_RATIO));
  const cx = diagramWidth / 2;
  const cy = DIAGRAM_SIZE / 2;
  const centerSize = orbSize * 0.73; // match Mood/Meds hero center size

  const rOuter = (orbSize / 2) * OUTER_RING_RATIO;
  const rMid = (orbSize / 2) * MID_RING_RATIO;
  const rInner = (orbSize / 2) * INNER_RING_RATIO;

  const rotationRad = useSharedValue(0);
  useEffect(() => {
    rotationRad.value = withRepeat(
      withTiming(2 * Math.PI, { duration: ROT_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationRad.value}rad` }],
  }));

  const showOverlays = heroState != null;
  const contextLine = heroState ? getSleepContextLine(heroState, hasData) : null;
  const confidenceHint = confidence ? confidenceNextStepForHero(confidence.label as 'Low' | 'Medium' | 'High', 'sleep') : null;

  return (
    <View
      style={{
        width: '100%',
        paddingTop: PADDING_TOP,
        paddingBottom: PADDING_BOTTOM,
        backgroundColor: theme.colors.background,
        overflow: 'visible',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: diagramWidth,
          height: DIAGRAM_SIZE,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: diagramWidth,
              height: DIAGRAM_SIZE,
            },
            ringAnimatedStyle,
          ]}
        >
          <Svg width={diagramWidth} height={DIAGRAM_SIZE}>
            <G>
              <Circle cx={cx} cy={cy} r={rOuter} fill="transparent" stroke={RING_DASH} strokeWidth={1} strokeDasharray={DASH_A} />
              <Circle cx={cx} cy={cy} r={rMid} fill="transparent" stroke={RING_FAINT} strokeWidth={0.9} strokeDasharray={DASH_B} />
              <Circle cx={cx} cy={cy} r={rInner} fill="transparent" stroke={RING_FAINT} strokeWidth={0.9} strokeDasharray={DASH_A} />
            </G>
          </Svg>
        </Animated.View>

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: cx - centerSize / 2 - 24,
            top: cy - centerSize / 2 - 24,
            width: centerSize + 48,
            height: centerSize + 48,
            overflow: 'visible',
          }}
        >
          <SleepMoonVisualization
            size={centerSize}
            canvasPadding={24}
            durationMin={durationMin}
            targetSleepMinutes={targetSleepMinutes}
            efficiency={efficiency}
            quality={quality}
            hasData={hasData}
          />
        </View>

        {showOverlays && heroState ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 16,
              left: OVERLAY_PADDING_H,
              right: OVERLAY_PADDING_H,
              alignItems: 'center',
              minHeight: 56,
              justifyContent: 'center',
            }}
          >
            <Text
              variant="titleLarge"
              style={{
                color: theme.colors.onSurface,
                fontWeight: '700',
                letterSpacing: 0.2,
                textAlign: 'center',
              }}
            >
              {heroState.title}
            </Text>
          </View>
        ) : null}

        {showOverlays && heroState ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              bottom: 68,
              left: OVERLAY_PADDING_H,
              right: OVERLAY_PADDING_H,
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 16,
              minHeight: 48,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                flex: 0,
                flexShrink: 0,
                maxWidth: '52%',
                alignSelf: 'flex-start',
                gap: 6,
              }}
            >
              {heroState.deltas.map((d) => (
                <Chip
                  key={d}
                  mode="outlined"
                  compact
                  style={{
                    borderRadius: 10,
                    backgroundColor: theme.colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: theme.colors.outlineVariant,
                    paddingHorizontal: 10,
                    paddingVertical: 2,
                  }}
                  textStyle={{ fontSize: 13, lineHeight: 18, color: theme.colors.onSurfaceVariant }}
                >
                  {d}
                </Chip>
              ))}
            </View>
            {contextLine ? (
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  opacity: 0.9,
                  flex: 1,
                  textAlign: 'right',
                  maxWidth: '45%',
                }}
              >
                {contextLine}
              </Text>
            ) : null}
          </View>
        ) : null}

        {showOverlays && confidence != null && trendDaysCount >= 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 20,
              left: OVERLAY_PADDING_H,
              right: OVERLAY_PADDING_H,
              alignItems: 'center',
            }}
          >
            <Text
              variant="labelSmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                opacity: 0.8,
              }}
            >
              {confidence.label} ({confidence.confPct}%) • {trendDaysCount} day{trendDaysCount === 1 ? '' : 's'} of data
            </Text>
            {confidenceHint ? (
              <Text
                variant="labelSmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                  opacity: 0.75,
                  marginTop: 4,
                }}
              >
                {confidenceHint}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
