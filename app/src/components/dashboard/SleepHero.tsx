/**
 * Sleep Hero - rings + moon center, no nodes.
 * Title + subtitle + stat line above moon; confidence pill on moon lower-right.
 */

import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Modal, Portal, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { SleepMoonVisualization } from './SleepMoonVisualization';
import { confidenceNextStepForHero } from '@/lib/display/confidenceGuidance';
import { RECLAIM_MONO_FONT } from '@/theme/reclaimFontFamilies';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const DIAGRAM_SIZE = 340;
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
  statLine?: string;
  deltas: string[];
  subtitle?: string;
};

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

function monoFontFamily(): string {
  return RECLAIM_MONO_FONT.default;
}

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
  const reduceMotion = useReducedMotion();
  const { width } = Dimensions.get('window');
  const diagramWidth = Math.min(width, DIAGRAM_SIZE);
  const [confidenceSheetOpen, setConfidenceSheetOpen] = useState(false);

  const orbSize = Math.min(ORB_MAX, Math.max(ORB_MIN, diagramWidth * ORB_WIDTH_RATIO));
  const cx = diagramWidth / 2;
  const cy = DIAGRAM_SIZE / 2;
  const centerSize = orbSize * 0.73;

  const rOuter = (orbSize / 2) * OUTER_RING_RATIO;
  const rMid = (orbSize / 2) * MID_RING_RATIO;
  const rInner = (orbSize / 2) * INNER_RING_RATIO;

  const rotationRad = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      rotationRad.value = 0;
      return;
    }
    rotationRad.value = withRepeat(
      withTiming(2 * Math.PI, { duration: ROT_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reduceMotion, rotationRad]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationRad.value}rad` }],
  }));

  const showOverlays = heroState != null;
  const confidenceHint = confidence
    ? confidenceNextStepForHero(confidence.label as 'Low' | 'Medium' | 'High', 'sleep')
    : null;

  const statLine =
    heroState?.statLine ??
    (heroState?.deltas?.length ? heroState.deltas.join(' · ') : null);

  const nightLabel =
    trendDaysCount === 1 ? '1 night' : trendDaysCount > 0 ? `${trendDaysCount} nights` : 'no nights';

  const confidencePillLabel = confidence
    ? trendDaysCount > 0
      ? `${confidence.label} · ${nightLabel}`
      : 'No data yet'
    : null;

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
              top: 8,
              left: OVERLAY_PADDING_H,
              right: OVERLAY_PADDING_H,
              alignItems: 'center',
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
            {heroState.subtitle ? (
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                  marginTop: 4,
                  lineHeight: 18,
                }}
                numberOfLines={2}
              >
                {heroState.subtitle}
              </Text>
            ) : null}
            {statLine ? (
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  lineHeight: 16,
                  fontFamily: monoFontFamily(),
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                  maxWidth: '100%',
                }}
                numberOfLines={2}
              >
                {statLine}
              </Text>
            ) : null}
          </View>
        ) : null}

        {showOverlays && confidencePillLabel ? (
          <Pressable
            onPress={() => setConfidenceSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Sleep confidence ${confidencePillLabel}. Tap for details.`}
            style={{
              position: 'absolute',
              left: cx + centerSize * 0.12,
              top: cy + centerSize * 0.22,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 14,
              backgroundColor: theme.colors.surfaceVariant,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600', fontSize: 11 }}
            >
              {confidencePillLabel}
            </Text>
            <MaterialCommunityIcons name="information-outline" size={14} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </View>

      <Portal>
        <Modal
          visible={confidenceSheetOpen}
          onDismiss={() => setConfidenceSheetOpen(false)}
          contentContainerStyle={{
            marginHorizontal: 20,
            marginBottom: 24,
            alignSelf: 'flex-end',
            width: '92%',
            maxWidth: 420,
            borderRadius: 16,
            padding: 16,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            Sleep confidence
          </Text>
          {confidence ? (
            <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
              {trendDaysCount > 0
                ? `Based on ${nightLabel} of imported sleep. Current read: ${confidence.label} (${confidence.confPct}%).`
                : 'No sleep nights imported yet — confidence will appear after your first night syncs in.'}
            </Text>
          ) : null}
          {confidenceHint ? (
            <Text variant="bodySmall" style={{ marginTop: 10, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
              {confidenceHint}
            </Text>
          ) : null}
          <Pressable
            onPress={() => setConfidenceSheetOpen(false)}
            style={{ alignSelf: 'flex-end', marginTop: 14, paddingVertical: 8, paddingHorizontal: 4 }}
            accessibilityRole="button"
          >
            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              Got it
            </Text>
          </Pressable>
        </Modal>
      </Portal>
    </View>
  );
}
