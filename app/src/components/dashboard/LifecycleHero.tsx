/**
 * Lifecycle Hero - full-bleed diagram at top of Dashboard.
 * Single rotating dotted ring, 6 capsule nodes, minimal center copy.
 * Premium, calm aesthetic.
 */

import React, { useEffect } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { BrainVisualization } from './BrainVisualization';
import { NodeToBrainConnectors, getNodeAngle } from './NodeToBrainConnectors';
import { VIEW_WIDTH } from './heroLayout';
import { getUserSettings } from '@/lib/userSettings';

export type LifecycleNodeId = 'mood' | 'sleep' | 'training' | 'meds' | 'insights' | 'breath';
export type NodeStatuses = Partial<Record<LifecycleNodeId, string>>;

/** Lightweight helper: compute node status strings from dashboard data. */
export function getLifecycleNodeStatuses(opts: {
  moodStreakCount?: number;
  /** Any mood check-in in last 7 days (shows node "on" even without consecutive streak) */
  hasMoodCheckinsRecent?: boolean;
  sleepData?: { durationMinutes?: number } | null;
  /** Precomputed meds lifecycle status from buildMedAdherenceSnapshot().lifecycleStatus */
  medLifecycleStatus?: string;
  hasInsight?: boolean;
  todayProgramDay?: { template_key?: string } | null;
  inProgressSession?: unknown;
  completedSessionToday?: unknown;
  hasActiveProgram?: boolean;
}): NodeStatuses {
  const {
    moodStreakCount = 0,
    hasMoodCheckinsRecent = false,
    sleepData,
    medLifecycleStatus = 'link',
    hasInsight,
    todayProgramDay,
    inProgressSession,
    completedSessionToday,
    hasActiveProgram,
  } = opts;

  let trainingStatus: string = '—';
  if (inProgressSession) {
    trainingStatus = 'active';
  } else if (completedSessionToday) {
    trainingStatus = 'done';
  } else if (todayProgramDay) {
    trainingStatus = 'today';
  } else if (hasActiveProgram) {
    trainingStatus = 'rest';
  } else {
    trainingStatus = 'link';
  }

  return {
    mood: moodStreakCount >= 1 || hasMoodCheckinsRecent ? 'steady' : '—',
    sleep: sleepData?.durationMinutes != null ? 'ok' : 'link',
    training: trainingStatus,
    meds: medLifecycleStatus,
    insights: hasInsight ? 'ready' : '—',
  };
}

type NodeConfig = {
  id: LifecycleNodeId;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const BRAIN_REGION_LABELS: Record<LifecycleNodeId, string> = {
  mood: 'Limbic • Serotonin',
  sleep: 'Hypothalamus • Melatonin',
  training: 'Motor cortex • Dopamine',
  meds: 'Prefrontal • Varies',
  insights: 'Prefrontal • BDNF',
  breath: '—',
};

const NODES: NodeConfig[] = [
  { id: 'mood', label: 'Mood', icon: 'emoticon-happy-outline' },
  { id: 'sleep', label: 'Sleep', icon: 'moon-waning-crescent' },
  { id: 'training', label: 'Exercise', icon: 'dumbbell' },
  { id: 'meds', label: 'Meds', icon: 'pill' },
  { id: 'insights', label: 'Insights', icon: 'chart-line' },
];

// --- Visual constants ---
const DIAGRAM_SIZE = 390;
const PADDING_TOP = 14;
/** Tighter handoff to greeting + tiles (rhythm with dashboard stack, not extra dead air). */
const PADDING_BOTTOM = 0;

const ROT_MS = 28000;

function heroPalette(dark: boolean) {
  return {
    ringFaint: dark ? 'rgba(226, 232, 240, 0.12)' : 'rgba(15, 23, 42, 0.09)',
    ringDash: dark ? 'rgba(226, 232, 240, 0.10)' : 'rgba(15, 23, 42, 0.07)',
    label: dark ? 'rgba(241, 245, 249, 0.96)' : 'rgba(15, 23, 42, 0.92)',
    subtle: dark ? 'rgba(148, 163, 184, 0.72)' : 'rgba(71, 85, 105, 0.78)',
    capsuleBg: dark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.82)',
    capsuleBorder: dark ? 'rgba(241, 245, 249, 0.08)' : 'rgba(15, 23, 42, 0.08)',
    capsuleGlow: dark ? 'rgba(226, 232, 240, 0.06)' : 'rgba(83, 201, 202, 0.08)',
  };
}

// Geometry
const ORB_WIDTH_RATIO = 0.44;
const ORB_MIN = 140;
const ORB_MAX = 210;

const OUTER_RING_RATIO = 1.32;
const MID_RING_RATIO = 1.08;
const INNER_RING_RATIO = 0.78;

// Node capsule sizing
const CAPSULE_W = 92;
const CAPSULE_H = 32;
const CAPSULE_RADIUS = 999;

// Dash patterns
const DASH_A = '3 7';
const DASH_B = '2 10';

// --- helpers ---
function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const x = cx + r * Math.sin(rad);
  const y = cy - r * Math.cos(rad);
  return { x, y };
}

type LifecycleHeroProps = {
  nodeStatuses?: NodeStatuses;
  onNodePress?: (id: LifecycleNodeId) => void;
  centerTitle?: string;
  animationActive?: boolean;
  /** When false, Skia brain + connectors are deferred (Phase E shell). */
  mountSkiaLayers?: boolean;
};

export function LifecycleHero({
  nodeStatuses = {},
  onNodePress,
  centerTitle = 'Today',
  animationActive = true,
  mountSkiaLayers = true,
}: LifecycleHeroProps) {
  const theme = useTheme();
  const palette = heroPalette(theme.dark);
  const userSettingsQ = useQuery({ queryKey: ['user:settings'], queryFn: getUserSettings, staleTime: 60_000 });
  const showAdvancedLabels = userSettingsQ.data?.nerdModeEnabled === true;
  const { width } = Dimensions.get('window');
  const diagramWidth = Math.min(width, DIAGRAM_SIZE);

  const orbSize = Math.min(ORB_MAX, Math.max(ORB_MIN, diagramWidth * ORB_WIDTH_RATIO));
  const cx = diagramWidth / 2;
  const cy = DIAGRAM_SIZE / 2;
  const brainSize = orbSize * 0.70; // 30% larger (0.54 * 1.3)

  const rOuter = (orbSize / 2) * OUTER_RING_RATIO;
  const rMid = (orbSize / 2) * MID_RING_RATIO;
  const rInner = (orbSize / 2) * INNER_RING_RATIO;

  const rotationRad = useSharedValue(0);
  useEffect(() => {
    if (!animationActive) {
      cancelAnimation(rotationRad);
      return;
    }
    rotationRad.value = withRepeat(
      withTiming(2 * Math.PI, { duration: ROT_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotationRad);
  }, [animationActive, rotationRad]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationRad.value}rad` }],
  }));

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
      {/* Single hero container: diagram area - everything shares (cx, cy) as centre */}
      <View
        style={{
          width: diagramWidth,
          height: DIAGRAM_SIZE,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Connectors */}
        {mountSkiaLayers ? (
          <NodeToBrainConnectors
            width={diagramWidth}
            height={DIAGRAM_SIZE}
            cx={cx}
            cy={cy}
            rOuter={rOuter + 2}
            brainSize={brainSize}
            brainOffsetX={0}
            brainOffsetY={0}
            nodeStatuses={nodeStatuses}
          />
        ) : null}

        {/* Rings - same size as container, so rotation pivot = (cx, cy) = view centre */}
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
              <Circle cx={cx} cy={cy} r={rOuter} fill="transparent" stroke={palette.ringDash} strokeWidth={1} strokeDasharray={DASH_A} />
              <Circle cx={cx} cy={cy} r={rMid} fill="transparent" stroke={palette.ringFaint} strokeWidth={0.9} strokeDasharray={DASH_B} />
              <Circle cx={cx} cy={cy} r={rInner} fill="transparent" stroke={palette.ringFaint} strokeWidth={0.9} strokeDasharray={DASH_A} />
            </G>
          </Svg>
        </Animated.View>

        {/* Brain - centred at (cx, cy), layout from heroLayout.ts */}
        {mountSkiaLayers ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: cx - brainSize / 2 - 24,
              top: cy - brainSize / 2 - 24,
              width: brainSize + 48,
              height: brainSize + 48,
              overflow: 'visible',
            }}
          >
            <BrainVisualization
              size={brainSize}
              canvasPadding={24}
              nodeStatuses={nodeStatuses}
              animationActive={animationActive}
            />
          </View>
        ) : null}

        {/* Nodes - positioned to align with brain region connectors */}
        {NODES.map((node) => {
          const scale = brainSize / VIEW_WIDTH;
          const angle = getNodeAngle(node.id, cx, cy, brainSize, scale);
          const pos = polarToCart(cx, cy, rOuter + 14, angle);
          const regionLabel = BRAIN_REGION_LABELS[node.id];

          const status = nodeStatuses[node.id] ?? '—';
          const active =
            status !== '—' &&
            status !== 'link' &&
            status !== 'no_logs' &&
            status !== 'attention';

          return (
            <View
              key={node.id}
              style={{
                position: 'absolute',
                left: pos.x - CAPSULE_W / 2,
                top: pos.y - CAPSULE_H / 2,
                alignItems: 'center',
              }}
            >
              <Pressable
                onPress={() => onNodePress?.(node.id)}
                style={{
                  width: CAPSULE_W,
                  height: CAPSULE_H,
                  borderRadius: CAPSULE_RADIUS,
                  backgroundColor: palette.capsuleBg,
                  borderWidth: 1,
                  borderColor: palette.capsuleBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  paddingHorizontal: 10,
                }}
                accessibilityLabel={`${node.label}, ${status}`}
                accessibilityRole="button"
              >
                {/* subtle capsule glow */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: -6,
                    top: -6,
                    right: -6,
                    bottom: -6,
                    borderRadius: CAPSULE_RADIUS,
                    backgroundColor: palette.capsuleGlow,
                    opacity: active ? 0.7 : 0.25,
                  }}
                />

                <MaterialCommunityIcons
                  name={node.icon}
                  size={16}
                  color={palette.label}
                  style={{ opacity: active ? 0.98 : 0.82 }}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: '700',
                    color: palette.label,
                    opacity: active ? 0.98 : 0.84,
                  }}
                  numberOfLines={1}
                >
                  {node.label}
                </Text>

                {/* tiny orbit marker dot like the mock */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: 6,
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    backgroundColor:
                      status === 'attention'
                        ? 'rgba(251, 146, 60, 0.92)'
                        : active
                          ? 'rgba(34, 197, 94, 0.92)'
                          : 'rgba(148, 163, 184, 0.35)',
                  }}
                />
              </Pressable>
              {showAdvancedLabels && regionLabel !== '—' ? (
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 9,
                    color: palette.subtle,
                    opacity: 0.85,
                  }}
                  numberOfLines={1}
                >
                  {regionLabel}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View
        style={{
          marginTop: 8,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 6,
        }}
        accessibilityLabel="Legend: green means on track, amber means needs attention, grey means no data yet"
      >
        {(
          [
            { color: 'rgba(34, 197, 94, 0.92)', label: 'On track' },
            { color: 'rgba(245, 158, 11, 0.92)', label: 'Needs attention' },
            { color: 'rgba(148, 163, 184, 0.5)', label: 'No data yet' },
          ] as const
        ).map(({ color, label }) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 18,
              backgroundColor: 'rgba(148, 163, 184, 0.12)',
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginRight: 6,
                backgroundColor: color,
              }}
            />
            <Text variant="labelSmall" style={{ color: palette.subtle, fontSize: 10 }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
