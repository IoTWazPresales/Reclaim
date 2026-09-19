import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, G } from 'react-native-svg';
import { LUMEN } from './labTokens';

export function SleepRibbon({ width = 320, height = 36 }: { width?: number; height?: number }) {
  const stages = [
    { x: 0, w: 0.08, c: LUMEN.sleep },
    { x: 0.08, w: 0.18, c: '#3d7ea8' },
    { x: 0.26, w: 0.12, c: LUMEN.sleep },
    { x: 0.38, w: 0.22, c: '#245a7a' },
    { x: 0.6, w: 0.14, c: LUMEN.sleep },
    { x: 0.74, w: 0.1, c: '#3d7ea8' },
    { x: 0.84, w: 0.16, c: LUMEN.muted },
  ];
  return (
    <Svg width={width} height={height} accessibilityLabel="Last night sleep stages">
      {stages.map((s, i) => (
        <Rect
          key={i}
          x={s.x * width}
          y={height * 0.15}
          width={s.w * width - 2}
          height={height * 0.7}
          rx={4}
          fill={s.c}
          opacity={0.95}
        />
      ))}
    </Svg>
  );
}

export function MoodSpark({ width = 140, height = 40 }: { width?: number; height?: number }) {
  const pts = [0.55, 0.4, 0.62, 0.35, 0.5, 0.28, 0.22];
  const d = pts
    .map((y, i) => {
      const x = (i / (pts.length - 1)) * (width - 8) + 4;
      const py = 6 + y * (height - 12);
      return `${i === 0 ? 'M' : 'L'}${x} ${py}`;
    })
    .join(' ');
  return (
    <Svg width={width} height={height} accessibilityLabel="Seven day mood">
      <Path d={d} stroke={LUMEN.mood} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {pts.map((y, i) => (
        <Circle
          key={i}
          cx={(i / (pts.length - 1)) * (width - 8) + 4}
          cy={6 + y * (height - 12)}
          r={i === pts.length - 1 ? 4 : 2.5}
          fill={LUMEN.mood}
        />
      ))}
    </Svg>
  );
}

export function DayRail({ width = 320, height = 56 }: { width?: number; height?: number }) {
  const blocks = [
    { x: 0.0, w: 0.28, c: LUMEN.sleep, label: 'sleep' },
    { x: 0.42, w: 0.08, c: LUMEN.meds, label: 'med' },
    { x: 0.58, w: 0.18, c: LUMEN.training, label: 'session' },
    { x: 0.88, w: 0.08, c: LUMEN.mood, label: 'check-in' },
  ];
  const now = 0.52;
  return (
    <Svg width={width} height={height} accessibilityLabel="Today timeline">
      <Rect x={0} y={height / 2 - 3} width={width} height={6} rx={3} fill="rgba(114,215,216,0.12)" />
      {blocks.map((b) => (
        <Rect key={b.label} x={b.x * width} y={height / 2 - 10} width={b.w * width} height={20} rx={10} fill={b.c} />
      ))}
      <Line x1={now * width} y1={6} x2={now * width} y2={height - 6} stroke={LUMEN.teal} strokeWidth={2} />
      <Circle cx={now * width} cy={height / 2} r={5} fill={LUMEN.teal} />
    </Svg>
  );
}

export function VolumeWeek({ width = 320, height = 120 }: { width?: number; height?: number }) {
  const days = [
    { n: 'M', stacks: [0.4, 0.25], today: false },
    { n: 'T', stacks: [0.35, 0.3], today: false },
    { n: 'W', stacks: [0.55, 0.2, 0.15], today: true },
    { n: 'T', stacks: [0.2], today: false },
    { n: 'F', stacks: [0.45, 0.25], today: false },
    { n: 'S', stacks: [], today: false },
    { n: 'S', stacks: [], today: false },
  ];
  const col = width / 7;
  const colors = [LUMEN.training, LUMEN.teal, LUMEN.meds];
  return (
    <Svg width={width} height={height} accessibilityLabel="This week training volume">
      {days.map((d, i) => {
        const x = i * col + 8;
        let y = height - 18;
        return (
          <G key={`${d.n}-${i}`}>
            {d.today ? (
              <Rect x={x - 4} y={8} width={col - 8} height={height - 12} rx={10} fill="rgba(114,215,216,0.12)" />
            ) : null}
            {d.stacks.map((h, si) => {
              const bh = h * (height - 36);
              y -= bh + 2;
              return <Rect key={si} x={x + 6} y={y} width={col - 28} height={bh} rx={4} fill={colors[si % colors.length]} />;
            })}
          </G>
        );
      })}
    </Svg>
  );
}

export function ConvergenceChart({ width = 320, height = 160 }: { width?: number; height?: number }) {
  const series = [
    { c: LUMEN.mood, d: 'M8 90 C 40 70, 80 110, 120 60 S 200 40, 310 55' },
    { c: LUMEN.sleep, d: 'M8 50 C 50 80, 90 40, 140 70 S 220 90, 310 48' },
    { c: LUMEN.training, d: 'M8 120 C 60 100, 100 130, 160 95 S 240 80, 310 88' },
  ];
  return (
    <Svg width={width} height={height} accessibilityLabel="Mood sleep training 28 day overlay">
      <Line x1={8} y1={height - 18} x2={width - 8} y2={height - 18} stroke={LUMEN.line} />
      <Line x1={8} y1={12} x2={8} y2={height - 18} stroke={LUMEN.line} />
      {series.map((s) => (
        <Path key={s.c} d={s.d} stroke={s.c} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      ))}
    </Svg>
  );
}

/** Geometric bench-press diagram — bar path, not a swinging-arm stick figure. */
export function BenchDiagram({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" accessibilityLabel="Barbell bench press path">
      <Rect x={28} y={108} width={104} height={10} rx={3} fill={LUMEN.raised} />
      <Rect x={48} y={78} width={64} height={32} rx={8} fill={LUMEN.surface} stroke={LUMEN.teal} strokeWidth={2} />
      <Circle cx={80} cy={62} r={14} fill="none" stroke={LUMEN.text} strokeWidth={2} />
      <Line x1={22} y1={70} x2={138} y2={70} stroke={LUMEN.training} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={22} cy={70} r={10} fill={LUMEN.training} />
      <Circle cx={138} cy={70} r={10} fill={LUMEN.training} />
      <Path d="M66 78 L58 70" stroke={LUMEN.text} strokeWidth={2} />
      <Path d="M94 78 L102 70" stroke={LUMEN.text} strokeWidth={2} />
    </Svg>
  );
}
