/**
 * Home state tiles — instrument-panel surfaces with data-true mini-visuals.
 * RN + react-native-svg + reanimated (no Skia).
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useAppTheme, RECLAIM_CHROME, reclaimChromeElevation } from '@/theme';
import {
  dashboardHomeTileTokens,
  homeTileDomainAccent,
  homeTileDomainGlowOpacity,
  homeTileLayout,
  homeTileSecondaryGlow,
  homeTileTypography,
  type HomeTileAccentKey,
} from '@/theme/dashboardHomeTiles';
import { formatSvgNum, isValidPathD } from '@/lib/svg/path';
import { SafeSvgPath } from '@/lib/svg/SafeSvgPath';

const AnimatedView = Animated.createAnimatedComponent(View);

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
  isEmpty?: boolean;
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
  isEmpty = false,
}: HomeDashboardTileProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const dark = theme.dark;
  const chrome = reclaimChromeElevation(appTheme, 'quiet');
  const chevronColor = dashboardHomeTileTokens.chevron(accent, dark);
  const glowPrimary = homeTileDomainAccent(accent, appTheme.domainAccents);
  const glowSecondary = homeTileSecondaryGlow(accent, appTheme.domainAccents);
  const glowOpacity = homeTileDomainGlowOpacity(dark);
  const grad = dashboardHomeTileTokens.surfaceGradient(dark);

  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const tileAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: pressed.value > 0 ? glowPrimary : 'transparent',
    borderWidth: pressed.value > 0 ? 1 : 0,
  }));

  const onPressIn = () => {
    if (reduceMotion) {
      scale.value = homeTileLayout.pressScale;
      pressed.value = 1;
      return;
    }
    scale.value = withSpring(homeTileLayout.pressScale, homeTileLayout.pressSpring);
    pressed.value = withTiming(1, { duration: 120 });
  };
  const onPressOut = () => {
    if (reduceMotion) {
      scale.value = 1;
      pressed.value = 0;
      return;
    }
    scale.value = withSpring(1, homeTileLayout.pressSpring);
    pressed.value = withTiming(0, { duration: 120 });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}. ${headline}. ${subline}`}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ flex: 1 }}
    >
      <AnimatedView
        style={[
          styles.tile,
          { borderRadius: RECLAIM_CHROME.cardRadius, ...chrome },
          tileAnimStyle,
        ]}
      >
        <TileSurfaceBackground top={grad.top} bottom={grad.bottom} />
        <View pointerEvents="none" style={[styles.topHairline, { backgroundColor: dashboardHomeTileTokens.edgeHighlight(dark) }]} />
        <View pointerEvents="none" style={[styles.leftHairline, { backgroundColor: dashboardHomeTileTokens.edgeHighlight(dark) }]} />
        <View pointerEvents="none" style={[styles.innerBorder, { borderColor: homeTileLayout.innerBorder }]} />
        <View pointerEvents="none" style={[styles.upperVeil, { backgroundColor: dashboardHomeTileTokens.satinUpper(dark) }]} />

        <View pointerEvents="none" style={styles.visualBand}>
          <VisualBandFade topColor={grad.top} />
          <View style={styles.visualGlow}>
            <TileDomainGlow accent={accent} dark={dark} primary={glowPrimary} secondary={glowSecondary} opacity={glowOpacity} pageColor={grad.page} />
            <View style={{ flex: 1, opacity: isEmpty ? homeTileLayout.emptyVisualOpacity : 1 }}>{visual}</View>
          </View>
        </View>

        <View style={styles.textPlane}>
          <View style={styles.labelRow}>
            <Text variant="labelSmall" style={[styles.label, homeTileTypography.label, { color: theme.colors.onSurfaceVariant }]}>
              {label}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={chevronColor} style={{ opacity: 0.36 }} />
          </View>
          <Text variant="titleSmall" style={[styles.headline, homeTileTypography.headline, { color: theme.colors.onSurface }]} numberOfLines={2}>
            {headline}
          </Text>
          <Text variant="bodySmall" style={[styles.subline, homeTileTypography.subline, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {subline}
          </Text>
        </View>
      </AnimatedView>
    </Pressable>
  );
}

function TileSurfaceBackground({ top, bottom }: { top: string; bottom: string }) {
  const gradId = 'tileSurfaceGrad';
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} stopOpacity={1} />
          <Stop offset="1" stopColor={bottom} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradId})`} />
    </Svg>
  );
}

function VisualBandFade({ topColor }: { topColor: string }) {
  const gradId = 'visualBandFade';
  return (
    <Svg width="100%" height="100%" style={[StyleSheet.absoluteFill, { zIndex: 2 }]} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={topColor} stopOpacity={1} />
          <Stop offset="0.35" stopColor={topColor} stopOpacity={0} />
          <Stop offset="1" stopColor={topColor} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradId})`} />
    </Svg>
  );
}

function TileDomainGlow({ accent, dark, primary, secondary, opacity, pageColor }: {
  accent: HomeTileAccentKey; dark: boolean; primary: string; secondary: string | null; opacity: number; pageColor: string;
}) {
  const gradId = `tileGlow-${accent}`;
  const gradId2 = `tileGlow2-${accent}`;
  const cx = accent === 'prediction' ? '20%' : accent === 'sleep' ? '48%' : accent === 'mood' ? '74%' : '42%';
  const cy = accent === 'training' ? '62%' : '68%';
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={gradId} cx={cx} cy={cy} rx="58%" ry="50%">
          <Stop offset="0" stopColor={primary} stopOpacity={opacity} />
          <Stop offset="0.42" stopColor={primary} stopOpacity={opacity * 0.38} />
          <Stop offset="1" stopColor={pageColor} stopOpacity={0} />
        </RadialGradient>
        {secondary ? (
          <RadialGradient id={gradId2} cx="82%" cy="58%" rx="42%" ry="38%">
            <Stop offset="0" stopColor={secondary} stopOpacity={opacity * 0.72} />
            <Stop offset="1" stopColor={pageColor} stopOpacity={0} />
          </RadialGradient>
        ) : null}
      </Defs>
      <Rect x="-6" y="8" width="112" height="96" fill={`url(#${gradId})`} />
      {secondary ? <Rect x="-6" y="8" width="112" height="96" fill={`url(#${gradId2})`} opacity={0.85} /> : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, overflow: 'hidden', minHeight: homeTileLayout.minHeight },
  topHairline: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 4 },
  leftHairline: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 1, opacity: 0.55, zIndex: 4 },
  innerBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderRadius: RECLAIM_CHROME.cardRadius, zIndex: 4 },
  upperVeil: { position: 'absolute', top: 0, left: 0, right: 0, height: '34%', zIndex: 1 },
  visualBand: { position: 'absolute', left: 0, right: 0, bottom: 0, height: `${homeTileLayout.visualBandHeightRatio * 100}%`, zIndex: 0, overflow: 'hidden' },
  visualGlow: { flex: 1 },
  textPlane: { flex: 1, padding: homeTileLayout.textPadding, zIndex: 3, maxWidth: '100%', justifyContent: 'flex-start' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { textTransform: 'uppercase', flex: 1, flexShrink: 1, marginRight: 6, paddingRight: 4 },
  headline: { marginTop: 8, letterSpacing: -0.22, paddingRight: 4, maxWidth: '100%' },
  subline: { marginTop: 4, paddingRight: 4, maxWidth: '100%' },
});

export type PredictionRibbonVisualProps = {
  tone: '+' | '~' | '-';
  confidence: number;
  dark: boolean;
  accent: string;
  reduceMotion: boolean;
};

export function PredictionRibbonVisual({ tone, confidence, dark, accent, reduceMotion }: PredictionRibbonVisualProps) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) { pulse.value = 1; return; }
    pulse.value = withRepeat(withTiming(1.35, { duration: 2400, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduceMotion, pulse]);

  const safeConfidence = Number.isFinite(confidence) ? confidence : 50;
  const bandHalf = 4 + (100 - safeConfidence) * 0.12;
  const centerY = tone === '+' ? 44 : tone === '-' ? 58 : 51;
  const ribbonTop = formatSvgNum(centerY - bandHalf);
  const ribbonBot = formatSvgNum(centerY + bandHalf);
  const centerYS = formatSvgNum(centerY);
  const ribbonD = `M -4 ${ribbonTop} C 28 ${formatSvgNum(centerY - bandHalf - 2)} 52 ${formatSvgNum(centerY - bandHalf + 1)} 78 ${formatSvgNum(centerY - 1)} C 92 ${centerYS} 104 ${formatSvgNum(centerY + 1)} 108 ${centerYS} L 108 ${ribbonBot} C 92 ${formatSvgNum(centerY + bandHalf + 1)} 78 ${ribbonBot} 52 ${formatSvgNum(centerY + bandHalf - 1)} C 28 ${formatSvgNum(centerY + bandHalf + 2)} 8 ${ribbonBot} -4 ${ribbonBot} Z`;
  const traceD = `M 6 ${formatSvgNum(centerY)} C 30 ${formatSvgNum(centerY - 3)} 54 ${formatSvgNum(centerY - 5)} 78 ${formatSvgNum(centerY - 4)} C 102 ${formatSvgNum(centerY - 3)} 102 ${formatSvgNum(centerY - 6)} 106 ${formatSvgNum(centerY - 8)}`;
  const nowX = 14;
  const nowY = centerY - 2;
  const dotStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 : 0.55 + (pulse.value - 1) * 0.9,
    transform: [{ scale: reduceMotion ? 1 : pulse.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="predRibbon" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={accent} stopOpacity={0.08} />
            <Stop offset="0.5" stopColor={accent} stopOpacity={0.22} />
            <Stop offset="1" stopColor={accent} stopOpacity={0.1} />
          </LinearGradient>
        </Defs>
        <SafeSvgPath source="PredictionRibbonVisual.ribbon" d={ribbonD} fill="url(#predRibbon)" />
        <SafeSvgPath source="PredictionRibbonVisual.trace" d={traceD} fill="none" stroke={dashboardHomeTileTokens.prediction.trajectory(dark)} strokeWidth={homeTileLayout.strokeWidth} strokeLinecap="round" />
        <SafeSvgPath source="PredictionRibbonVisual.traceGlow" d={traceD} fill="none" stroke={dashboardHomeTileTokens.prediction.glowUnderlay(accent)} strokeWidth={homeTileLayout.strokeWidth * 3} strokeLinecap="round" opacity={0.5} />
        <Circle cx={nowX} cy={nowY} r={3.8} fill={dashboardHomeTileTokens.prediction.now(dark)} />
      </Svg>
      <AnimatedView pointerEvents="none" style={[{ position: 'absolute', left: `${nowX}%`, top: `${nowY}%`, width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: 5, backgroundColor: dashboardHomeTileTokens.prediction.now(dark) }, dotStyle]} />
    </View>
  );
}

export type SleepHypnoMiniSegment = { key: string; leftPct: number; widthPct: number; y: number; color: string; stage?: string };
const SLEEP_LANES = [{ key: 'W', y: 33 }, { key: 'R', y: 47 }, { key: 'L', y: 61 }, { key: 'D', y: 76 }] as const;
const HYPN_BAND = 7.4;

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

export function SleepHypnoMiniVisual({ segments, dark, accent, skeleton = false }: { segments: SleepHypnoMiniSegment[]; dark: boolean; accent: string; skeleton?: boolean }) {
  const opacity = skeleton ? homeTileLayout.emptyVisualOpacity : 1;
  const connectEls: React.ReactNode[] = [];
  for (let i = 1; i < segments.length; i++) {
    const y0 = hypnoLaneCenter(segments[i - 1].stage, segments[i - 1].y);
    const y1 = hypnoLaneCenter(segments[i].stage, segments[i].y);
    if (Math.abs(y0 - y1) < 0.5) continue;
    const x = formatSvgNum(segments[i].leftPct);
    const y0s = formatSvgNum(y0);
    const y1s = formatSvgNum(y1);
    const mid = formatSvgNum((y0 + y1) / 2);
    const bulge = formatSvgNum(y1 > y0 ? 2.5 : -2.5);
    const joinD = `M ${x} ${y0s} Q ${formatSvgNum(segments[i].leftPct + (y1 > y0 ? 2.5 : -2.5))} ${mid} ${x} ${y1s}`;
    if (!isValidPathD(joinD)) continue;
    connectEls.push(
      <SafeSvgPath
        key={`${segments[i].key}-join`}
        source="SleepHypnoMiniVisual.join"
        d={joinD}
        fill="none"
        stroke={dashboardHomeTileTokens.sleep.connector(dark)}
        strokeWidth={homeTileLayout.strokeWidth * 0.4}
        strokeLinecap="round"
        opacity={opacity}
      />,
    );
  }
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      {SLEEP_LANES.map((lane) => (
        <G key={lane.key}>
          <Line x1={10} x2={97} y1={lane.y} y2={lane.y} stroke={dashboardHomeTileTokens.sleep.guide(dark)} strokeWidth={0.5} opacity={opacity * 0.9} />
          <SvgText x={4} y={lane.y + 2.5} fontSize={7} fontFamily="monospace" fill={dashboardHomeTileTokens.sleep.laneLabel(dark)} opacity={opacity * 0.85}>{lane.key}</SvgText>
        </G>
      ))}
      {connectEls}
      {(skeleton || !segments.length) && SLEEP_LANES.map((lane) => (
        <Rect key={`sk-${lane.key}`} x={22} y={lane.y - HYPN_BAND / 2} width={56} height={HYPN_BAND} rx={3} fill={dashboardHomeTileTokens.sleep.light(dark)} opacity={opacity * 0.35} />
      ))}
      {segments.map((seg) => {
        const x0 = seg.leftPct;
        const w = Math.max(0.45, seg.widthPct - 0.15);
        const cx = hypnoLaneCenter(seg.stage, seg.y);
        const y = cx - HYPN_BAND / 2;
        return (
          <G key={seg.key} opacity={0.7 * opacity}>
            <Rect x={x0 + 0.08} y={y} width={w} height={HYPN_BAND} rx={3} fill={seg.color} />
            <Line x1={x0 + 0.08} y1={y} x2={x0 + 0.08 + w} y2={y} stroke={accent} strokeWidth={1} strokeLinecap="round" />
          </G>
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

export function MoodRhythmVisual({ dots, dark, zoneTint, accent, skeleton = false }: { dots: MoodDot[]; dark: boolean; zoneTint?: string; accent: string; skeleton?: boolean }) {
  const opacity = skeleton ? homeTileLayout.emptyVisualOpacity : 1;
  const n = dots.length || 7;
  const pts = dots.map((d, i) => ({ x: ((i + 0.5) / n) * 100, y: moodY(d.rating, i), d }));
  let threadD = '';
  pts.forEach((p, i) => {
    const x = formatSvgNum(p.x);
    const y = formatSvgNum(p.y);
    if (i === 0) threadD += `M ${x} ${y} `;
    else {
      const prev = pts[i - 1];
      const mx = formatSvgNum((prev.x + p.x) / 2);
      const py = formatSvgNum(prev.y);
      threadD += `C ${mx} ${py} ${mx} ${y} ${x} ${y} `;
    }
  });
  const wash = zoneTint ?? dashboardHomeTileTokens.prediction.glowUnderlay(accent);
  const showThread = isValidPathD(threadD);
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      {wash ? <Rect x="0" y="40" width="100" height="55" fill={wash} opacity={opacity * 0.65} /> : null}
      {showThread ? (
        <>
          <SafeSvgPath source="MoodRhythmVisual.thread" d={threadD} fill="none" stroke={accent} strokeWidth={homeTileLayout.strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * 0.85} />
          <SafeSvgPath source="MoodRhythmVisual.threadGlow" d={threadD} fill="none" stroke={wash} strokeWidth={homeTileLayout.strokeWidth * 3} strokeLinecap="round" opacity={opacity * 0.35} />
        </>
      ) : null}
      {pts.map((p) => {
        if (p.d.rating == null && !skeleton) return null;
        const r = p.d.isToday ? 5 : 3.2;
        return <Circle key={p.d.key} cx={p.x} cy={p.y} r={r} fill={accent} stroke={p.d.isToday ? (dark ? '#e0f2fe' : '#1e40af') : 'transparent'} strokeWidth={p.d.isToday ? 1.5 : 0} opacity={opacity * (p.d.isToday ? 1 : 0.75)} />;
      })}
      {skeleton && pts.map((p, i) => <Circle key={`sk-${i}`} cx={p.x} cy={p.y} r={2.5} fill={accent} opacity={opacity * 0.3} />)}
    </Svg>
  );
}

export type TrainingRailCell = { key: string; state: 'future' | 'done' | 'planned' | 'rest' | 'in_progress' | 'empty'; isToday: boolean };
const TRAIN_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export function TrainingWeekRailVisual({ cells, dark, accent, skeleton = false }: { cells: TrainingRailCell[]; dark: boolean; accent: string; skeleton?: boolean }) {
  const opacity = skeleton ? homeTileLayout.emptyVisualOpacity : 1;
  const rail = dark ? 'rgba(148,163,184,0.38)' : 'rgba(71,85,105,0.46)';
  const label = dashboardHomeTileTokens.sleep.laneLabel(dark);
  const labelToday = dark ? 'rgba(186,230,253,0.95)' : 'rgba(12,74,110,0.88)';
  const baselineY = 62;
  const colW = 100 / 7;
  const topY = 30;
  const blockH = baselineY - topY - 1.5;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Line x1="3" y1={baselineY} x2="97" y2={baselineY} stroke={rail} strokeWidth={0.72} opacity={opacity * 0.5} />
      {cells.map((c, i) => {
        const cx = i * colW + colW / 2;
        const w = 9;
        const x0 = cx - w / 2;
        const nodes: React.ReactNode[] = [];
        switch (c.state) {
          case 'done':
            nodes.push(<Rect key="blk" x={x0} y={topY} width={w} height={blockH} rx={3} fill={accent} opacity={opacity * (c.isToday ? 0.92 : 0.68)} />);
            break;
          case 'planned':
          case 'in_progress':
            nodes.push(<Rect key="blk" x={x0} y={topY} width={w} height={blockH} rx={3} fill={c.state === 'in_progress' ? accent : 'transparent'} stroke={accent} strokeWidth={c.isToday ? 1.5 : 1} opacity={opacity * 0.88} />);
            break;
          case 'rest':
            nodes.push(<Rect key="rest" x={x0} y={topY} width={w} height={blockH} rx={3} fill="none" stroke={rail} strokeWidth={1} strokeDasharray="3 4" opacity={opacity * 0.4} />);
            break;
          default:
            nodes.push(<Rect key="fut" x={x0} y={topY + blockH * 0.25} width={w} height={blockH * 0.5} rx={3} fill="none" stroke={rail} strokeWidth={0.8} strokeDasharray="2 3" opacity={opacity * 0.35} />);
        }
        if (c.isToday) nodes.push(<Rect key="today" x={x0 - 1} y={topY - 1} width={w + 2} height={blockH + 2} rx={3.5} fill="none" stroke={accent} strokeWidth={1.5} opacity={opacity * 0.9} />);
        nodes.push(<SvgText key="lab" x={cx} y={92} fontSize={7} fontWeight={c.isToday ? '700' : '600'} fill={c.isToday ? labelToday : label} textAnchor="middle" opacity={opacity * (c.isToday ? 0.92 : 0.55)}>{TRAIN_LABELS[i]}</SvgText>);
        return <G key={c.key}>{nodes}</G>;
      })}
    </Svg>
  );
}
