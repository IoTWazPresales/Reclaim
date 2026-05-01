import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

type MedsDoseVisualizationProps = {
  size: number;
  canvasPadding?: number;
  adherencePct: number;
  dosesToday: number;
  takenToday: number;
  overdueToday: number;
  tone?: 'steady' | 'drift' | 'unstable' | 'empty';
};

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

const TONE_COLORS = {
  steady: {
    glow: 'rgba(52, 211, 153, 0.24)',
    coreA: 'rgba(16, 185, 129, 0.92)',
    coreB: 'rgba(45, 212, 191, 0.84)',
    progress: 'rgba(52, 211, 153, 0.95)',
  },
  drift: {
    glow: 'rgba(250, 204, 21, 0.22)',
    coreA: 'rgba(245, 158, 11, 0.9)',
    coreB: 'rgba(251, 191, 36, 0.84)',
    progress: 'rgba(250, 204, 21, 0.94)',
  },
  unstable: {
    glow: 'rgba(248, 113, 113, 0.24)',
    coreA: 'rgba(239, 68, 68, 0.9)',
    coreB: 'rgba(251, 113, 133, 0.82)',
    progress: 'rgba(248, 113, 113, 0.95)',
  },
  empty: {
    glow: 'rgba(148, 163, 184, 0.16)',
    coreA: 'rgba(100, 116, 139, 0.82)',
    coreB: 'rgba(148, 163, 184, 0.75)',
    progress: 'rgba(148, 163, 184, 0.85)',
  },
} as const;

export function MedsDoseVisualization({
  size,
  canvasPadding = 24,
  adherencePct,
  dosesToday,
  takenToday,
  overdueToday,
  tone = 'steady',
}: MedsDoseVisualizationProps) {
  const visualSize = Math.max(80, size + canvasPadding * 2);
  const center = visualSize / 2;
  const ringRadius = size * 0.44;
  const secondaryRingRadius = ringRadius - size * 0.08;
  const ringStroke = Math.max(5, size * 0.06);
  const capsuleH = size * 0.42;
  const capsuleW = Math.max(24, size * 0.16);

  const colors = TONE_COLORS[tone];
  const pct = clamp(adherencePct / 100);

  const circumference = 2 * Math.PI * ringRadius;
  const dash = pct * circumference;
  const secondaryCircumference = 2 * Math.PI * secondaryRingRadius;
  const secondaryDash = clamp((pct + 0.12) % 1) * secondaryCircumference;

  const doseDots = useMemo(() => {
    const visibleCount = Math.min(6, Math.max(1, dosesToday || 1));
    const done = Math.min(visibleCount, Math.max(0, takenToday));
    const overdue = Math.min(visibleCount - done, Math.max(0, overdueToday));
    const remaining = Math.max(0, visibleCount - done - overdue);
    return { visibleCount, done, overdue, remaining };
  }, [dosesToday, takenToday, overdueToday]);

  return (
    <View
      style={{
        width: visualSize,
        height: visualSize,
        overflow: 'visible',
      }}
    >
      <Svg width={visualSize} height={visualSize}>
        <Defs>
          <RadialGradient id="meds_aura" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.glow} stopOpacity="0.95" />
            <Stop offset="70%" stopColor={colors.glow} stopOpacity="0.32" />
            <Stop offset="100%" stopColor={colors.glow} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="meds_ring_progress" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.progress} stopOpacity="0.98" />
            <Stop offset="60%" stopColor="rgba(125, 211, 252, 0.92)" />
            <Stop offset="100%" stopColor="rgba(167, 139, 250, 0.9)" />
          </LinearGradient>
          <LinearGradient id="meds_capsule_body" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="rgba(248, 250, 252, 0.95)" />
            <Stop offset="36%" stopColor={colors.coreB} stopOpacity="0.92" />
            <Stop offset="100%" stopColor={colors.coreA} stopOpacity="0.96" />
          </LinearGradient>
          <LinearGradient id="meds_capsule_split" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="rgba(186, 230, 253, 0.85)" />
            <Stop offset="100%" stopColor="rgba(244, 114, 182, 0.82)" />
          </LinearGradient>
        </Defs>
        <G>
          <Circle cx={center} cy={center} r={size * 0.48} fill="url(#meds_aura)" />
          <Circle cx={center} cy={center} r={size * 0.32} fill="rgba(15, 23, 42, 0.35)" />

          <Circle
            cx={center}
            cy={center}
            r={ringRadius}
            fill="transparent"
            stroke="rgba(226, 232, 240, 0.22)"
            strokeWidth={ringStroke}
          />
          <Circle
            cx={center}
            cy={center}
            r={ringRadius}
            fill="transparent"
            stroke="url(#meds_ring_progress)"
            strokeWidth={ringStroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            rotation={-90}
            origin={`${center}, ${center}`}
          />
          <Circle
            cx={center}
            cy={center}
            r={secondaryRingRadius}
            fill="transparent"
            stroke="rgba(148, 163, 184, 0.26)"
            strokeWidth={Math.max(2, ringStroke * 0.35)}
            strokeDasharray="2 8"
          />
          <Circle
            cx={center}
            cy={center}
            r={secondaryRingRadius}
            fill="transparent"
            stroke="rgba(186, 230, 253, 0.92)"
            strokeWidth={Math.max(2, ringStroke * 0.34)}
            strokeLinecap="round"
            strokeDasharray={`${secondaryDash} ${secondaryCircumference}`}
            rotation={-90}
            origin={`${center}, ${center}`}
          />

          <Circle cx={center} cy={center} r={size * 0.24} fill="rgba(15, 23, 42, 0.46)" />

          <Rect
            x={center - capsuleW / 2}
            y={center - capsuleH / 2}
            width={capsuleW}
            height={capsuleH}
            rx={capsuleW / 2}
            fill="url(#meds_capsule_body)"
          />
          <Rect
            x={center}
            y={center - capsuleH / 2}
            width={capsuleW / 2}
            height={capsuleH}
            fill="url(#meds_capsule_split)"
          />
          <Rect
            x={center - capsuleW / 2}
            y={center - capsuleH / 2}
            width={capsuleW}
            height={Math.max(8, capsuleH * 0.24)}
            rx={capsuleW / 2}
            fill="rgba(255, 255, 255, 0.28)"
          />
          <Rect
            x={center - 1}
            y={center - capsuleH / 2 + 4}
            width={2}
            height={capsuleH - 8}
            rx={1}
            fill="rgba(255, 255, 255, 0.36)"
          />

          {Array.from({ length: doseDots.visibleCount }).map((_, i) => {
            const angle = (-130 + i * (260 / Math.max(1, doseDots.visibleCount - 1))) * (Math.PI / 180);
            const r = ringRadius + ringStroke + 8;
            const x = center + Math.cos(angle) * r;
            const y = center + Math.sin(angle) * r;

            let fill = 'rgba(148, 163, 184, 0.35)';
            if (i < doseDots.done) fill = 'rgba(52, 211, 153, 0.95)';
            else if (i < doseDots.done + doseDots.overdue) fill = 'rgba(248, 113, 113, 0.95)';
            else if (i < doseDots.done + doseDots.overdue + doseDots.remaining) fill = 'rgba(251, 191, 36, 0.85)';

            return <Circle key={`dose_dot_${i}`} cx={x} cy={y} r={3.2} fill={fill} />;
          })}

          <Circle
            cx={center + capsuleW * 0.18}
            cy={center - capsuleH * 0.28}
            r={Math.max(2, capsuleW * 0.12)}
            fill="rgba(255, 255, 255, 0.72)"
          />
        </G>
      </Svg>
    </View>
  );
}

