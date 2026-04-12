/**
 * Home state tiles — one integrated surface; visuals live in the same plane as type (backdrop),
 * not a footer strip. RN + react-native-svg only (no Skia).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { dashboardHomeTileTokens, type HomeTileAccentKey } from '@/theme/dashboardHomeTiles';

const TILE_SURFACE_DARK = '#0a0c10';
const TILE_SURFACE_LIGHT = '#e8eaef';

export type HomeDashboardTileAccent = HomeTileAccentKey;

export type HomeDashboardTileProps = {
  accent: HomeDashboardTileAccent;
  label: string;
  headline: string;
  subline: string;
  onPress: () => void;
  reduceMotion: boolean;
  visual: React.ReactNode;
  accessibilityLabel?: string;
};

export function HomeDashboardTile({
  accent,
  label,
  headline,
  subline,
  onPress,
  reduceMotion,
  visual,
  accessibilityLabel,
}: HomeDashboardTileProps) {
  const theme = useTheme();
  const dark = theme.dark;
  const chevronOpacity = useRef(new Animated.Value(0.3)).current;
  const surface = dashboardHomeTileTokens.surface(accent, dark);
  const border = dashboardHomeTileTokens.border(accent, dark);
  const chevronColor = dashboardHomeTileTokens.chevron(accent, dark);

  useEffect(() => {
    if (reduceMotion) {
      chevronOpacity.setValue(0.34);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronOpacity, {
          toValue: 0.48,
          duration: 3400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(chevronOpacity, {
          toValue: 0.28,
          duration: 3400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [chevronOpacity, reduceMotion]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}. ${headline}. ${subline}`}
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.97 : 1 }]}
    >
      <View
        style={[
          styles.tile,
          {
            backgroundColor: surface,
            borderColor: border,
            shadowColor: dark ? '#000000' : theme.colors.primary,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.topHairline, { backgroundColor: dashboardHomeTileTokens.edgeHighlight(dark) }]}
        />
        <View
          pointerEvents="none"
          style={[styles.leftHairline, { backgroundColor: dashboardHomeTileTokens.edgeHighlight(dark) }]}
        />
        <View pointerEvents="none" style={[styles.upperVeil, { backgroundColor: dashboardHomeTileTokens.satinUpper(dark) }]} />

        {/* Visual plane: starts mid-tile, bleeds under copy — not a footer band */}
        <View pointerEvents="none" style={styles.visualPlane}>
          {visual}
        </View>

        <View style={styles.textPlane}>
          <View style={styles.labelRow}>
            <Text variant="labelSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
              {label}
            </Text>
            <Animated.View style={{ opacity: chevronOpacity }}>
              <MaterialCommunityIcons name="chevron-right" size={16} color={chevronColor} />
            </Animated.View>
          </View>
          <Text variant="titleSmall" style={[styles.headline, { color: theme.colors.onSurface }]} numberOfLines={2}>
            {headline}
          </Text>
          <Text variant="bodySmall" style={[styles.subline, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {subline}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 172,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  topHairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 3,
  },
  leftHairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 1,
    opacity: 0.55,
    zIndex: 3,
  },
  upperVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '34%',
    zIndex: 1,
  },
  visualPlane: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '27%',
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  textPlane: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    zIndex: 2,
    maxWidth: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    fontSize: 8.5,
    fontWeight: '600',
    opacity: 0.58,
    flex: 1,
    flexShrink: 1,
    marginRight: 6,
    paddingRight: 4,
  },
  headline: {
    marginTop: 10,
    fontWeight: '700',
    fontSize: 14.5,
    lineHeight: 18,
    letterSpacing: -0.22,
    paddingRight: 2,
  },
  subline: {
    marginTop: 3,
    fontSize: 10.5,
    lineHeight: 13,
    opacity: 0.7,
    paddingRight: 2,
  },
});

export type PredictionRibbonVisualProps = {
  tone: '+' | '~' | '-';
  confidence: number;
  shift: Animated.Value;
  reduceMotion: boolean;
  dark: boolean;
};

export function PredictionRibbonVisual({ tone, confidence, dark }: PredictionRibbonVisualProps) {
  const u = Math.max(0, 100 - confidence);
  const lift = 6 + u * 0.08;
  let c1y = 68;
  let c2y = 58;
  if (tone === '+') {
    c1y = 62 - lift * 0.35;
    c2y = 48 - lift * 0.45;
  } else if (tone === '-') {
    c1y = 74 + lift * 0.25;
    c2y = 82 + lift * 0.2;
  }

  const areaD = `M -8 108 L -8 ${c1y + 18} C 22 ${c1y - 4} 48 ${c2y - 8} 78 ${c2y} C 92 ${c2y + 4} 104 ${c2y + 8} 112 ${c2y + 6} L 112 108 Z`;
  const traceD = `M 4 ${c1y + 12} C 28 ${c1y} 52 ${c2y} 76 ${c2y - 2} S 102 ${c2y - 6} 106 ${c2y - 10}`;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 108" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="predGlowV" cx="18%" cy="72%" rx="40%" ry="36%">
          <Stop offset="0" stopColor={dashboardHomeTileTokens.prediction.glowViolet(dark)} stopOpacity={dark ? 0.52 : 0.44} />
          <Stop offset="1" stopColor={dark ? TILE_SURFACE_DARK : TILE_SURFACE_LIGHT} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="predGlowC" cx="88%" cy="58%" rx="34%" ry="30%">
          <Stop offset="0" stopColor={dashboardHomeTileTokens.prediction.glowCyan(dark)} stopOpacity={dark ? 0.44 : 0.4} />
          <Stop offset="1" stopColor={dark ? TILE_SURFACE_DARK : TILE_SURFACE_LIGHT} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="predField" x1="0.5" y1="1" x2="0.85" y2="0.35">
          <Stop offset="0" stopColor={dark ? 'rgba(15,23,42,0.45)' : 'rgba(241,245,249,0.35)'} stopOpacity={dark ? 0.28 : 0.2} />
          <Stop offset="1" stopColor={dark ? TILE_SURFACE_DARK : TILE_SURFACE_LIGHT} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="predTrace" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={dark ? '#e0f2fe' : '#155e75'} stopOpacity={dark ? 0.15 : 0.2} />
          <Stop offset="0.35" stopColor={dark ? '#bae6fd' : '#0891b2'} stopOpacity={dark ? 0.75 : 0.65} />
          <Stop offset="1" stopColor={dark ? '#7dd3fc' : '#0e7490'} stopOpacity={dark ? 0.35 : 0.35} />
        </LinearGradient>
      </Defs>
      <Rect x="-10" y="24" width="120" height="95" fill="url(#predGlowV)" opacity={0.72} />
      <Rect x="-10" y="24" width="120" height="95" fill="url(#predGlowC)" opacity={0.68} />
      <Path d={areaD} fill="url(#predField)" />
      <Path
        d={traceD}
        fill="none"
        stroke="url(#predTrace)"
        strokeWidth={2.2}
        strokeLinecap="round"
        vectorEffect="nonScalingStroke"
      />
      <Path
        d={traceD}
        fill="none"
        stroke={dark ? 'rgba(125,211,252,0.28)' : 'rgba(14,165,233,0.2)'}
        strokeWidth={4.5}
        strokeLinecap="round"
        opacity={0.36}
      />
      <Circle cx={14} cy={c1y + 10} r={3.2} fill={dashboardHomeTileTokens.prediction.now(dark)} opacity={0.95} />
    </Svg>
  );
}

export type SleepHypnoMiniSegment = { key: string; leftPct: number; widthPct: number; y: number; color: string; stage?: string };

const HYPN_BAND = 6.1;

function hypnoLaneCenter(stage: string | undefined, yFallback: number): number {
  if (stage) {
    const s = stage.toLowerCase();
    if (s.includes('awake')) return 33;
    if (s.includes('rem')) return 47;
    if (s.includes('deep')) return 76;
    if (s.includes('light')) return 61;
  }
  if (yFallback < 0.55) return 33;
  if (yFallback >= 1.85) return 76;
  if (yFallback >= 1.25) return 47;
  return 61;
}

export function SleepHypnoMiniVisual({ segments, dark }: { segments: SleepHypnoMiniSegment[]; dark: boolean }) {
  const lanes = [33, 47, 61, 76];
  const connectEls: React.ReactNode[] = [];
  for (let i = 1; i < segments.length; i++) {
    const y0 = hypnoLaneCenter(segments[i - 1].stage, segments[i - 1].y);
    const y1 = hypnoLaneCenter(segments[i].stage, segments[i].y);
    if (Math.abs(y0 - y1) < 0.5) continue;
    const x = segments[i].leftPct;
    const mid = (y0 + y1) / 2;
    const bulge = y1 > y0 ? 2.5 : -2.5;
    const softD = `M ${x} ${y0} Q ${x + bulge} ${mid} ${x} ${y1}`;
    connectEls.push(
      <Path
        key={`${segments[i].key}-join`}
        d={softD}
        fill="none"
        stroke={dashboardHomeTileTokens.sleep.connector(dark)}
        strokeWidth={0.78}
        strokeLinecap="round"
        vectorEffect="nonScalingStroke"
      />,
    );
  }

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 108" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="sleepNight" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={dark ? 'rgba(15,23,42,0)' : 'rgba(248,250,252,0)'} stopOpacity={0} />
          <Stop offset="0.4" stopColor={dashboardHomeTileTokens.sleep.nightWash(dark)} stopOpacity={0.26} />
          <Stop offset="1" stopColor={dashboardHomeTileTokens.sleep.nightTeal(dark)} stopOpacity={dark ? 0.4 : 0.32} />
        </LinearGradient>
      </Defs>
      <Rect x="-4" y="18" width="108" height="92" fill="url(#sleepNight)" />
      {!segments.length ? (
        <>
          {lanes.map((ly, idx) => (
            <Line
              key={`sleep-lane-ph-${idx}`}
              x1={3}
              x2={97}
              y1={ly}
              y2={ly}
              stroke={dashboardHomeTileTokens.sleep.guide(dark)}
              strokeWidth={0.35}
              opacity={0.45}
              vectorEffect="nonScalingStroke"
            />
          ))}
          <Rect
            x={18}
            y={58 - HYPN_BAND / 2}
            width={64}
            height={HYPN_BAND}
            rx={2}
            ry={2}
            fill={dashboardHomeTileTokens.sleep.light(dark)}
            opacity={dark ? 0.22 : 0.2}
          />
        </>
      ) : (
        lanes.map((ly, idx) => (
          <Line
            key={`sleep-lane-${idx}`}
            x1={3}
            x2={97}
            y1={ly}
            y2={ly}
            stroke={dashboardHomeTileTokens.sleep.guide(dark)}
            strokeWidth={0.48}
            vectorEffect="nonScalingStroke"
          />
        ))
      )}
      {connectEls}
      {segments.map((seg) => {
        const x0 = seg.leftPct;
        const x1 = seg.leftPct + seg.widthPct;
        const w = Math.max(0.45, x1 - x0 - 0.15);
        const cx = hypnoLaneCenter(seg.stage, seg.y);
        const y = cx - HYPN_BAND / 2;
        return (
          <Rect
            key={seg.key}
            x={x0 + 0.08}
            y={y}
            width={w}
            height={HYPN_BAND}
            rx={2}
            ry={2}
            fill={seg.color}
            opacity={dark ? 0.78 : 0.74}
          />
        );
      })}
    </Svg>
  );
}

export function sleepStageColorForTile(stage: string, dark: boolean): string {
  const s = stage.toLowerCase();
  if (s.includes('awake')) return dashboardHomeTileTokens.sleep.awake(dark);
  if (s.includes('deep')) return dashboardHomeTileTokens.sleep.deep(dark);
  if (s.includes('rem')) return dashboardHomeTileTokens.sleep.rem(dark);
  if (s.includes('light')) return dashboardHomeTileTokens.sleep.light(dark);
  return dashboardHomeTileTokens.sleep.default(dark);
}

export type MoodDot = { key: string; rating: number | null; isToday: boolean };

function moodY(rating: number | null, idx: number): number {
  if (rating == null) return 72 + Math.sin(idx * 0.85) * 2.2;
  const n = rating > 5 ? rating / 2 : rating;
  return 76 - (n / 5) * 36;
}

function moodNodeFill(rating: number | null, dark: boolean): string {
  if (rating == null) return 'transparent';
  const n = rating > 5 ? rating / 2 : rating;
  if (n <= 2) return dark ? 'rgba(252, 165, 165, 0.9)' : 'rgba(239, 68, 68, 0.75)';
  if (n <= 3.5) return dark ? 'rgba(253, 224, 71, 0.75)' : 'rgba(234, 179, 8, 0.72)';
  if (n <= 4.5) return dark ? 'rgba(147, 197, 253, 0.88)' : 'rgba(59, 130, 246, 0.78)';
  return dark ? 'rgba(110, 231, 183, 0.85)' : 'rgba(16, 185, 129, 0.72)';
}

export function MoodRhythmVisual({
  dots,
  dark,
  zoneTint,
}: {
  dots: MoodDot[];
  dark: boolean;
  zoneTint?: string;
}) {
  const n = dots.length || 7;
  const pts = dots.map((d, i) => ({
    x: ((i + 0.5) / n) * 100,
    y: moodY(d.rating, i),
    d,
  }));

  let threadD = '';
  pts.forEach((p, i) => {
    if (i === 0) threadD += `M ${p.x} ${p.y} `;
    else {
      const prev = pts[i - 1];
      const mx = (prev.x + p.x) / 2;
      threadD += `Q ${mx} ${(prev.y + p.y) / 2 + (i % 2 === 0 ? -2 : 1)} ${p.x} ${p.y} `;
    }
  });

  const todayPt = pts.find((p) => p.d.isToday) ?? pts[pts.length - 1];
  const moodCx = Math.min(84, Math.max(14, todayPt.x + (todayPt.x > 62 ? -4 : 0)));
  const moodCy = Math.min(82, Math.max(46, todayPt.y + 5));

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 108" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="moodPresence" cx={moodCx} cy={moodCy} r={28} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={zoneTint ?? (dark ? 'rgba(96,165,250,0.14)' : 'rgba(59,130,246,0.1)')} stopOpacity={0.88} />
          <Stop offset="0.55" stopColor={zoneTint ?? (dark ? 'rgba(96,165,250,0.06)' : 'rgba(59,130,246,0.05)')} stopOpacity={0.42} />
          <Stop offset="1" stopColor={dark ? TILE_SURFACE_DARK : TILE_SURFACE_LIGHT} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="-4" y="34" width="104" height="76" fill="url(#moodPresence)" opacity={0.7} />
      <Path
        d={threadD}
        fill="none"
        stroke={dark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.34)'}
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="nonScalingStroke"
      />
      {pts.map((p) => {
        const r = p.d.isToday ? 4.2 : p.d.rating != null ? 2.9 : 2.2;
        const stroke = p.d.isToday ? (dark ? 'rgba(186,230,253,0.65)' : 'rgba(59,130,246,0.45)') : 'transparent';
        const sw = p.d.isToday ? 1.5 : 0;
        return (
          <Circle
            key={p.d.key}
            cx={p.x}
            cy={p.y}
            r={r}
            fill={p.d.rating != null ? moodNodeFill(p.d.rating, dark) : 'transparent'}
            stroke={stroke}
            strokeWidth={sw}
            opacity={p.d.rating != null ? (p.d.isToday ? 1 : 0.88) : 0.4}
          />
        );
      })}
    </Svg>
  );
}

export type TrainingRailCell = {
  key: string;
  state: 'future' | 'done' | 'planned' | 'rest' | 'in_progress' | 'empty';
  isToday: boolean;
};

const TRAIN_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export function TrainingWeekRailVisual({
  cells,
  dark,
  reduceMotion: _reduceMotion,
}: {
  cells: TrainingRailCell[];
  dark: boolean;
  reduceMotion: boolean;
}) {
  const accent = dark ? 'rgba(56,189,248,0.9)' : 'rgba(14,165,233,0.84)';
  const accentSoft = dark ? 'rgba(56,189,248,0.13)' : 'rgba(14,165,233,0.1)';
  const rail = dark ? 'rgba(148,163,184,0.34)' : 'rgba(71,85,105,0.42)';
  const railFine = dark ? 'rgba(148,163,184,0.16)' : 'rgba(71,85,105,0.2)';
  const label = dark ? 'rgba(148,163,184,0.4)' : 'rgba(71,85,105,0.46)';
  const labelToday = dark ? 'rgba(186,230,253,0.88)' : 'rgba(12,74,110,0.82)';
  const doneFill = dark ? 'rgba(96,165,250,0.46)' : 'rgba(37,99,235,0.4)';
  const futureStroke = dark ? 'rgba(148,163,184,0.32)' : 'rgba(100,116,139,0.35)';
  const restStroke = dark ? 'rgba(148,163,184,0.36)' : 'rgba(100,116,139,0.34)';

  const baselineY = 64;
  const colW = 100 / 7;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 108" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      {[1, 2, 3, 4, 5, 6].map((k) => (
        <Line
          key={`train-grid-${k}`}
          x1={k * colW}
          y1={27}
          x2={k * colW}
          y2={66}
          stroke={rail}
          strokeWidth={0.42}
          opacity={0.15}
          vectorEffect="nonScalingStroke"
        />
      ))}
      <Line x1={4} y1={29} x2={96} y2={29} stroke={rail} strokeWidth={0.48} opacity={0.32} vectorEffect="nonScalingStroke" />
      <Line x1="3" y1={baselineY} x2="97" y2={baselineY} stroke={rail} strokeWidth={0.72} vectorEffect="nonScalingStroke" />
      <Line x1="3" y1={baselineY + 0.55} x2="97" y2={baselineY + 0.55} stroke={railFine} strokeWidth={0.38} opacity={0.55} vectorEffect="nonScalingStroke" />
      {cells.map((c, i) => {
        const cx = i * colW + colW / 2;
        const w = c.isToday ? 11.5 : 8;
        const x0 = cx - w / 2;
        const topY = 34;
        const blockH = baselineY - topY - 1.5;
        const nodes: React.ReactNode[] = [];

        if (c.isToday) {
          nodes.push(
            <Rect
              key="cap"
              x={cx - 6}
              y={20.5}
              width={12}
              height={3.4}
              rx={1}
              fill={dark ? 'rgba(56,189,248,0.22)' : 'rgba(14,165,233,0.16)'}
              stroke={accent}
              strokeWidth={0.7}
              opacity={0.92}
            />,
          );
          nodes.push(
            <Line
              key="caret"
              x1={cx}
              y1={24}
              x2={cx}
              y2={topY - 0.5}
              stroke={accent}
              strokeWidth={0.65}
              vectorEffect="nonScalingStroke"
              opacity={0.38}
            />,
          );
        }

        const slotTick = (
          <Line
            key="tick"
            x1={cx}
            y1={baselineY}
            x2={cx}
            y2={baselineY + 3.4}
            stroke={c.isToday ? accent : rail}
            strokeWidth={c.isToday ? 1.05 : 0.52}
            opacity={c.isToday ? 0.78 : 0.38}
            vectorEffect="nonScalingStroke"
          />
        );
        nodes.push(slotTick);

        switch (c.state) {
          case 'done':
            nodes.push(<Rect key="blk" x={x0} y={topY} width={w} height={blockH} rx={1.35} fill={doneFill} opacity={c.isToday ? 0.92 : 0.68} />);
            if (c.isToday) {
              nodes.push(
                <Rect key="rim" x={x0 - 1} y={topY - 1} width={w + 2} height={blockH + 2} rx={1.9} fill="none" stroke={accent} strokeWidth={0.75} opacity={0.48} />,
              );
            }
            break;
          case 'planned':
            nodes.push(
              <Rect
                key="blk"
                x={x0}
                y={topY}
                width={w}
                height={blockH}
                rx={1.35}
                fill={accentSoft}
                stroke={accent}
                strokeWidth={c.isToday ? 0.95 : 0.72}
                opacity={c.isToday ? 1 : 0.88}
              />,
            );
            break;
          case 'in_progress':
            nodes.push(<Rect key="blk" x={x0} y={topY} width={w} height={blockH} rx={1.35} fill={accent} opacity={dark ? 0.68 : 0.62} />);
            break;
          case 'future':
            nodes.push(
              <Rect key="blk" x={x0} y={topY + blockH * 0.35} width={w} height={blockH * 0.5} rx={1.1} fill="none" stroke={futureStroke} strokeWidth={0.68} opacity={0.48} />,
            );
            break;
          case 'rest':
            nodes.push(
              <Rect key="restBox" x={x0} y={topY} width={w} height={blockH} rx={1.35} fill="none" stroke={restStroke} strokeWidth={0.62} opacity={0.92} />,
            );
            nodes.push(
              <Line
                key="restEm"
                x1={cx - 3.5}
                y1={topY + blockH * 0.5}
                x2={cx + 3.5}
                y2={topY + blockH * 0.5}
                stroke={restStroke}
                strokeWidth={0.72}
                strokeLinecap="round"
                opacity={0.88}
              />,
            );
            if (c.isToday) {
              nodes.push(
                <Rect key="restToday" x={x0 - 1.2} y={topY - 1.2} width={w + 2.4} height={blockH + 2.4} rx={1.85} fill="none" stroke={accent} strokeWidth={0.72} opacity={0.34} />,
              );
            }
            break;
          default:
            nodes.push(
              <Rect key="empty" x={x0} y={topY + blockH * 0.2} width={w} height={blockH * 0.45} rx={1.1} fill="none" stroke={futureStroke} strokeWidth={0.52} opacity={0.32} />,
            );
        }

        nodes.push(
          <SvgText
            key="lab"
            x={cx}
            y={100}
            fontSize={7}
            fontWeight={c.isToday ? '700' : '600'}
            fill={c.isToday ? labelToday : label}
            textAnchor="middle"
            opacity={c.isToday ? 0.92 : 0.55}
          >
            {TRAIN_LABELS[i]}
          </SvgText>,
        );

        return <G key={c.key}>{nodes}</G>;
      })}
    </Svg>
  );
}
