import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from 'react-native-paper';
import type { MovementIntent } from '@/lib/training/types';
import { primaryIntentForDiagram } from '@/lib/training/movementPatternCues';

type Props = {
  intents: MovementIntent[];
  size?: number;
  exerciseName?: string | null;
  exerciseId?: string | null;
};

/** Stick-figure movement arc keyed by primary movement pattern (name/id heuristics first). */
export default function MovementPatternDiagram({
  intents,
  size = 120,
  exerciseName,
  exerciseId,
}: Props) {
  const theme = useTheme();
  const stroke = theme.colors.primary;
  const accent = theme.colors.secondary;
  const intent = primaryIntentForDiagram(intents, exerciseName, exerciseId);

  const diagram = useMemo(() => {
    const s = size;
    const cx = s / 2;
    const headY = s * 0.14;
    const shoulderY = s * 0.28;
    const hipY = s * 0.52;
    const kneeY = s * 0.72;
    const footY = s * 0.9;
    const headR = s * 0.07;

    const stick = {
      head: { cx, cy: headY, r: headR },
      spine: { x1: cx, y1: headY + headR, x2: cx, y2: hipY },
      shoulder: { x1: cx - s * 0.18, y1: shoulderY, x2: cx + s * 0.18, y2: shoulderY },
      legL: { x1: cx, y1: hipY, x2: cx - s * 0.12, y2: footY },
      legR: { x1: cx, y1: hipY, x2: cx + s * 0.12, y2: footY },
    };

    let arcPath = '';
    let armPath = '';
    let highlight: React.ReactNode = null;

    switch (intent) {
      case 'knee_dominant':
        arcPath = `M ${cx - s * 0.22} ${hipY} Q ${cx} ${kneeY + s * 0.08} ${cx + s * 0.08} ${footY}`;
        armPath = `M ${cx - s * 0.18} ${shoulderY} L ${cx - s * 0.22} ${hipY + s * 0.05}`;
        break;
      case 'hip_hinge':
        arcPath = `M ${cx - s * 0.2} ${shoulderY} Q ${cx + s * 0.05} ${hipY} ${cx + s * 0.18} ${hipY + s * 0.12}`;
        armPath = `M ${cx - s * 0.18} ${shoulderY} L ${cx - s * 0.05} ${hipY}`;
        highlight = (
          <Line x1={cx - s * 0.2} y1={shoulderY} x2={cx + s * 0.2} y2={hipY + s * 0.1} stroke={accent} strokeWidth={2} strokeDasharray="4 3" />
        );
        break;
      case 'horizontal_press':
        arcPath = `M ${cx - s * 0.28} ${shoulderY} Q ${cx} ${shoulderY - s * 0.06} ${cx + s * 0.28} ${shoulderY}`;
        armPath = `M ${cx - s * 0.18} ${shoulderY} L ${cx + s * 0.28} ${shoulderY}`;
        break;
      case 'vertical_press':
        arcPath = `M ${cx} ${shoulderY + s * 0.04} Q ${cx + s * 0.06} ${shoulderY - s * 0.18} ${cx} ${shoulderY - s * 0.22}`;
        armPath = `M ${cx} ${shoulderY} L ${cx} ${shoulderY - s * 0.22}`;
        break;
      case 'horizontal_pull':
      case 'vertical_pull':
      case 'elbow_flexion':
        arcPath = `M ${cx + s * 0.26} ${shoulderY} Q ${cx} ${shoulderY + s * 0.08} ${cx - s * 0.1} ${hipY}`;
        armPath = `M ${cx + s * 0.18} ${shoulderY} L ${cx - s * 0.04} ${hipY - s * 0.04}`;
        break;
      case 'carry':
        arcPath = `M ${cx - s * 0.24} ${hipY - s * 0.04} L ${cx + s * 0.24} ${hipY - s * 0.04}`;
        armPath = `M ${cx - s * 0.18} ${shoulderY} L ${cx - s * 0.24} ${hipY - s * 0.04}`;
        highlight = (
          <Line x1={cx + s * 0.18} y1={shoulderY} x2={cx + s * 0.24} y2={hipY - s * 0.04} stroke={accent} strokeWidth={2} />
        );
        break;
      case 'trunk_stability':
        arcPath = `M ${cx - s * 0.2} ${hipY} L ${cx + s * 0.2} ${hipY}`;
        armPath = `M ${cx - s * 0.18} ${shoulderY} L ${cx + s * 0.18} ${shoulderY}`;
        highlight = (
          <Circle cx={cx} cy={hipY} r={s * 0.09} stroke={accent} strokeWidth={2} fill="none" />
        );
        break;
      default:
        arcPath = `M ${cx - s * 0.15} ${shoulderY} Q ${cx} ${hipY} ${cx + s * 0.15} ${shoulderY}`;
        armPath = `M ${cx - s * 0.18} ${shoulderY} L ${cx + s * 0.18} ${shoulderY}`;
    }

    return { stick, arcPath, armPath, highlight };
  }, [intent, size, accent]);

  const sw = 2.5;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={diagram.stick.head.cx}
          cy={diagram.stick.head.cy}
          r={diagram.stick.head.r}
          stroke={stroke}
          strokeWidth={sw}
          fill="none"
        />
        <Line
          x1={diagram.stick.spine.x1}
          y1={diagram.stick.spine.y1}
          x2={diagram.stick.spine.x2}
          y2={diagram.stick.spine.y2}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <Line
          x1={diagram.stick.shoulder.x1}
          y1={diagram.stick.shoulder.y1}
          x2={diagram.stick.shoulder.x2}
          y2={diagram.stick.shoulder.y2}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <Line
          x1={diagram.stick.legL.x1}
          y1={diagram.stick.legL.y1}
          x2={diagram.stick.legL.x2}
          y2={diagram.stick.legL.y2}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <Line
          x1={diagram.stick.legR.x1}
          y1={diagram.stick.legR.y1}
          x2={diagram.stick.legR.x2}
          y2={diagram.stick.legR.y2}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {diagram.armPath ? (
          <Path d={diagram.armPath} stroke={stroke} strokeWidth={sw} strokeLinecap="round" fill="none" />
        ) : null}
        {diagram.arcPath ? (
          <Path d={diagram.arcPath} stroke={accent} strokeWidth={sw + 0.5} strokeLinecap="round" fill="none" />
        ) : null}
        {diagram.highlight}
      </Svg>
    </View>
  );
}
