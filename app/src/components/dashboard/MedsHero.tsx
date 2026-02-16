/**
 * Meds Hero - premium rings + dose core visualization.
 * Text overlays: title above core, chips + context below, confidence underneath.
 */

import React, { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Chip, Text, useTheme } from 'react-native-paper';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { MedsDoseVisualization } from './MedsDoseVisualization';

const DIAGRAM_SIZE = 400;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 20;
const OVERLAY_PADDING_H = 20;

const RING_FAINT = 'rgba(226, 232, 240, 0.12)';
const RING_DASH = 'rgba(226, 232, 240, 0.10)';
const ROT_MS = 28000;
const ROT_MS_FAST = 17000;
const PULSE_MS = 2600;

const ORB_WIDTH_RATIO = 0.44;
const ORB_MIN = 140;
const ORB_MAX = 210;

const OUTER_RING_RATIO = 1.32;
const MID_RING_RATIO = 1.08;
const INNER_RING_RATIO = 0.78;

const DASH_A = '3 7';
const DASH_B = '2 10';
const DASH_C = '1.5 7';

export type MedsHeroState = {
  title: string;
  deltas: string[];
  subtitle?: string;
  tone?: 'steady' | 'drift' | 'unstable' | 'empty';
};

function getMedsContextLine(heroState: MedsHeroState | undefined, hasMeds: boolean): string | null {
  if (!heroState) return null;
  if (heroState.subtitle) return heroState.subtitle;
  return hasMeds ? 'Generated from your latest medication logs.' : 'Add medications to begin tracking.';
}

type MedsHeroProps = {
  hasMeds: boolean;
  adherencePct: number;
  dosesToday: number;
  takenToday: number;
  overdueToday: number;
  heroState?: MedsHeroState;
  confidence?: { label: string; confPct: number };
  trendDaysCount?: number;
};

export function MedsHero({
  hasMeds,
  adherencePct,
  dosesToday,
  takenToday,
  overdueToday,
  heroState,
  confidence,
  trendDaysCount = 0,
}: MedsHeroProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const diagramWidth = Math.min(width, DIAGRAM_SIZE);

  const orbSize = Math.min(ORB_MAX, Math.max(ORB_MIN, diagramWidth * ORB_WIDTH_RATIO));
  const cx = diagramWidth / 2;
  const cy = DIAGRAM_SIZE / 2;
  const centerSize = orbSize * 0.73; // 30% larger (0.56 * 1.3)

  const rOuter = (orbSize / 2) * OUTER_RING_RATIO;
  const rMid = (orbSize / 2) * MID_RING_RATIO;
  const rInner = (orbSize / 2) * INNER_RING_RATIO;

  const rotationRad = useSharedValue(0);
  const reverseRotationRad = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    rotationRad.value = withRepeat(withTiming(2 * Math.PI, { duration: ROT_MS, easing: Easing.linear }), -1, false);
    reverseRotationRad.value = withRepeat(
      withTiming(-2 * Math.PI, { duration: ROT_MS_FAST, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationRad.value}rad` }],
  }));
  const counterRingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${reverseRotationRad.value}rad` }],
  }));
  const corePulseStyle = useAnimatedStyle(() => {
    const scale = 1 + pulse.value * 0.02;
    const opacity = 0.95 + pulse.value * 0.05;
    return { transform: [{ scale }], opacity };
  });

  const tone = heroState?.tone ?? (hasMeds ? 'steady' : 'empty');
  const contextLine = getMedsContextLine(heroState, hasMeds);
  const showOverlays = heroState != null;

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
            counterRingAnimatedStyle,
          ]}
        >
          <Svg width={diagramWidth} height={DIAGRAM_SIZE}>
            <G>
              <Circle
                cx={cx}
                cy={cy}
                r={rMid * 1.15}
                fill="transparent"
                stroke="rgba(125, 211, 252, 0.22)"
                strokeWidth={0.9}
                strokeDasharray={DASH_C}
              />
              <Circle cx={cx + 4} cy={cy - rOuter + 3} r={2.2} fill="rgba(186, 230, 253, 0.8)" />
              <Circle cx={cx - 6} cy={cy + rInner + 4} r={1.8} fill="rgba(167, 139, 250, 0.76)" />
              <Circle cx={cx + rInner - 5} cy={cy + 7} r={1.8} fill="rgba(251, 191, 36, 0.78)" />
            </G>
          </Svg>
        </Animated.View>

        <Animated.View
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
          <Animated.View style={corePulseStyle}>
            <MedsDoseVisualization
              size={centerSize}
              canvasPadding={24}
              adherencePct={adherencePct}
              dosesToday={dosesToday}
              takenToday={takenToday}
              overdueToday={overdueToday}
              tone={tone}
            />
          </Animated.View>
        </Animated.View>

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
                  minWidth: 0,
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
          </View>
        ) : null}
      </View>
    </View>
  );
}

