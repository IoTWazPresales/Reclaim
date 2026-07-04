import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { homeTileLayout } from '@/theme/dashboardHomeTiles';

type BandChartProps = {
  typicalLow: number;
  typicalHigh: number;
  userValue: number;
  domainMin: number;
  domainMax: number;
  accent: string;
  formatValue?: (v: number) => string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function PopulationBandChart({
  typicalLow,
  typicalHigh,
  userValue,
  domainMin,
  domainMax,
  accent,
  formatValue,
}: BandChartProps) {
  const theme = useTheme();
  const dark = theme.dark;
  const span = domainMax - domainMin || 1;
  const toX = (v: number) => clamp(((v - domainMin) / span) * 100, 2, 98);
  const bandX = toX(typicalLow);
  const bandW = Math.max(4, toX(typicalHigh) - bandX);
  const dotX = toX(userValue);
  const rail = dark ? 'rgba(148,163,184,0.35)' : 'rgba(71,85,105,0.28)';
  const bandFill = dark ? 'rgba(129,170,240,0.18)' : 'rgba(37,99,235,0.12)';

  return (
    <View style={{ marginTop: 10 }}>
      <Svg width="100%" height={44} viewBox="0 0 100 44" preserveAspectRatio="none">
        <Line x1={4} y1={22} x2={96} y2={22} stroke={rail} strokeWidth={homeTileLayout.strokeWidth} strokeLinecap="round" />
        <Rect x={bandX} y={14} width={bandW} height={16} rx={4} fill={bandFill} stroke={accent} strokeWidth={0.75} opacity={0.9} />
        <Circle cx={dotX} cy={22} r={5} fill={accent} stroke={dark ? '#0f172a' : '#fff'} strokeWidth={1.5} />
      </Svg>
      {formatValue ? (
        <Text variant="labelSmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant, opacity: 0.75 }}>
          You: {formatValue(userValue)}
        </Text>
      ) : null}
    </View>
  );
}

type CompareRowProps = {
  label: string;
  copy: string;
  typicalLow: number;
  typicalHigh: number;
  userValue: number;
  domainMin: number;
  domainMax: number;
  formatValue?: (v: number) => string;
};

export function PopulationCompareRow({
  label,
  copy,
  typicalLow,
  typicalHigh,
  userValue,
  domainMin,
  domainMax,
  formatValue,
}: CompareRowProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const accent = appTheme.domainAccents.sleep;

  return (
    <View style={{ marginTop: 14 }}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {label}
      </Text>
      <PopulationBandChart
        typicalLow={typicalLow}
        typicalHigh={typicalHigh}
        userValue={userValue}
        domainMin={domainMin}
        domainMax={domainMax}
        accent={accent}
        formatValue={formatValue}
      />
      <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
        {copy}
      </Text>
    </View>
  );
}
