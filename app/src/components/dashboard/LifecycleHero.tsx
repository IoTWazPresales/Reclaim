/**
 * Lifecycle Hero - full-bleed diagram at top of Dashboard.
 * Single rotating dotted ring, 6 capsule nodes, minimal center copy.
 * Premium, calm aesthetic.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BrainVisualization } from './BrainVisualization';

export type LifecycleNodeId = 'mood' | 'sleep' | 'training' | 'meds' | 'breath' | 'insights';
export type NodeStatuses = Partial<Record<LifecycleNodeId, string>>;

/** Lightweight helper: compute node status strings from dashboard data. */
export function getLifecycleNodeStatuses(opts: {
  moodStreakCount?: number;
  sleepData?: { durationMinutes?: number } | null;
  medAdherencePct?: number | null;
  upcomingDosesCount?: number;
  hasInsight?: boolean;
}): NodeStatuses {
  const { moodStreakCount = 0, sleepData, medAdherencePct, upcomingDosesCount = 0, hasInsight } = opts;
  return {
    mood: moodStreakCount >= 1 ? 'steady' : '—',
    sleep: sleepData?.durationMinutes != null ? 'ok' : 'link',
    training: 'rest',
    meds: medAdherencePct != null || upcomingDosesCount > 0 ? 'on track' : 'link',
    breath: '—',
    insights: hasInsight ? 'ready' : '—',
  };
}

type NodeConfig = {
  id: LifecycleNodeId;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const NODES: NodeConfig[] = [
  { id: 'mood', label: 'Mood', icon: 'emoticon-happy-outline' },
  { id: 'sleep', label: 'Sleep', icon: 'moon-waning-crescent' },
  { id: 'training', label: 'Training', icon: 'dumbbell' },
  { id: 'meds', label: 'Meds', icon: 'pill' },
  { id: 'breath', label: 'Breath', icon: 'leaf' },
  { id: 'insights', label: 'Insights', icon: 'chart-line' },
];

// --- Visual constants tuned toward the "cosmic amber" mock ---
const HERO_HEIGHT = 300;
const PADDING_TOP = 14;
const PADDING_BOTTOM = 18;

const RING_FAINT = 'rgba(226, 232, 240, 0.12)';
const RING_DASH = 'rgba(226, 232, 240, 0.10)';

const LABEL = 'rgba(241, 245, 249, 0.96)';
const SUBTLE = 'rgba(148, 163, 184, 0.72)';

const CAPSULE_BG = 'rgba(15, 23, 42, 0.5)';
const CAPSULE_BORDER = 'rgba(241, 245, 249, 0.08)';
const CAPSULE_GLOW = 'rgba(226, 232, 240, 0.06)';

const ROT_MS = 28000;

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
};

export function LifecycleHero({ nodeStatuses = {}, onNodePress, centerTitle = 'Today' }: LifecycleHeroProps) {
  const theme = useTheme();
  const { width } = Dimensions.get('window');
  const heroWidth = Math.min(width, 520);

  const orbSize = Math.min(ORB_MAX, Math.max(ORB_MIN, heroWidth * ORB_WIDTH_RATIO));
  const cx = heroWidth / 2;
  const cy = HERO_HEIGHT / 2;

  const rOuter = (orbSize / 2) * OUTER_RING_RATIO;
  const rMid = (orbSize / 2) * MID_RING_RATIO;
  const rInner = (orbSize / 2) * INNER_RING_RATIO;

  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: ROT_MS, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View
      style={{
        width: '100%',
        paddingTop: PADDING_TOP,
        paddingBottom: PADDING_BOTTOM,
        backgroundColor: theme.colors.background,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: heroWidth, height: HERO_HEIGHT, alignSelf: 'center' }}>
        {/* Single rotating ring - calm, premium */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: heroWidth,
            height: HERO_HEIGHT,
            transform: [{ rotate: rotation }],
          }}
        >
          <Svg width={heroWidth} height={HERO_HEIGHT}>
            <G>
              <Circle cx={cx} cy={cy} r={rOuter} fill="transparent" stroke={RING_DASH} strokeWidth={1} strokeDasharray={DASH_A} />
              <Circle cx={cx} cy={cy} r={rMid} fill="transparent" stroke={RING_FAINT} strokeWidth={0.9} strokeDasharray={DASH_B} />
              <Circle cx={cx} cy={cy} r={rInner} fill="transparent" stroke={RING_FAINT} strokeWidth={0.9} strokeDasharray={DASH_A} />
            </G>
          </Svg>
        </Animated.View>

        {/* Center - Brain visualization */}
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: cx - orbSize / 2,
            top: cy - orbSize / 2,
            width: orbSize,
            height: orbSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BrainVisualization 
            size={orbSize * 0.6} 
            nodeStatuses={nodeStatuses} 
          />
          <Text style={{ color: SUBTLE, fontSize: 10, marginTop: 4 }} numberOfLines={1}>
            {centerTitle}
          </Text>
        </View>

        {/* Nodes (capsules) */}
        {NODES.map((node, i) => {
          // Arrange like the mock: evenly spaced around ring, starting near top.
          const angle = i * 60;
          const pos = polarToCart(cx, cy, rOuter + 14, angle);

          const status = nodeStatuses[node.id] ?? '—';
          const active = status !== '—';

          return (
            <Pressable
              key={node.id}
              onPress={() => onNodePress?.(node.id)}
              style={{
                position: 'absolute',
                left: pos.x - CAPSULE_W / 2,
                top: pos.y - CAPSULE_H / 2,
                width: CAPSULE_W,
                height: CAPSULE_H,
                borderRadius: CAPSULE_RADIUS,
                backgroundColor: CAPSULE_BG,
                borderWidth: 1,
                borderColor: CAPSULE_BORDER,
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
                  backgroundColor: CAPSULE_GLOW,
                  opacity: active ? 0.7 : 0.25,
                }}
              />

              <MaterialCommunityIcons
                name={node.icon}
                size={16}
                color={LABEL}
                style={{ opacity: active ? 0.98 : 0.82 }}
              />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  fontWeight: '700',
                  color: LABEL,
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
                  backgroundColor: active ? 'rgba(34, 197, 94, 0.92)' : 'rgba(148, 163, 184, 0.35)',
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
