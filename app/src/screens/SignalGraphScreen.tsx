/**
 * Signal graph — reads reclaim_signal_ledger only (U3).
 */
import React, { useMemo } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { InformationalCard } from '@/components/ui';
import { useAppTheme } from '@/theme';
import {
  reclaimStandardScreenScroll,
  RECLAIM_SCREEN_HORIZONTAL,
  RECLAIM_SCREEN_TOP_INSET,
  reclaimSectionSpacing,
} from '@/theme/reclaimScreenLayout';
import { reclaimUtilityCardSurface } from '@/theme/reclaimVisualLanguage';
import { readSignalLedgerMultiSeries } from '@/lib/localData/signalLedgerRepository';

const FACTORS = [
  { key: 'mood.last', label: 'Mood', colorKey: 'primary' as const },
  { key: 'sleep.lastNight.hours', label: 'Sleep (h)', colorKey: 'tertiary' as const },
  { key: 'steps.lastDay', label: 'Steps', colorKey: 'secondary' as const },
  { key: 'training.weeklySessionCount', label: 'Training / wk', colorKey: 'primary' as const },
] as const;

function SeriesBars({
  values,
  color,
  height = 72,
}: {
  values: number[];
  color: string;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  const { width } = useWindowDimensions();
  const barW = Math.max(4, Math.min(14, (width - 80) / Math.max(values.length, 1) - 2));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 2 }}>
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            width: barW,
            height: Math.max(2, (v / max) * height),
            backgroundColor: color,
            borderRadius: 2,
            opacity: 0.85,
          }}
        />
      ))}
    </View>
  );
}

export default function SignalGraphScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme), [appTheme]);

  const seriesQ = useQuery({
    queryKey: ['signal-ledger:graph', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return {};
      return readSignalLedgerMultiSeries(
        userId,
        FACTORS.map((f) => f.key),
        21,
      );
    },
    staleTime: 30_000,
  });

  const hasAnyPoints = useMemo(() => {
    const data = seriesQ.data ?? {};
    return FACTORS.some((f) => (data[f.key]?.length ?? 0) > 0);
  }, [seriesQ.data]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        reclaimStandardScreenScroll,
        {
          paddingHorizontal: RECLAIM_SCREEN_HORIZONTAL,
          paddingTop: RECLAIM_SCREEN_TOP_INSET,
          paddingBottom: 40,
        },
      ]}
    >
      <View style={reclaimSectionSpacing}>
        <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
          Signal graph
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, lineHeight: 20 }}>
          Your mood, sleep, steps, and training from the Signal Ledger — the same history insights use. Sparse data
          shows an honest seeding state until enough days accumulate.
        </Text>
      </View>

      <View style={reclaimSectionSpacing}>
        {seriesQ.isLoading ? (
          <ActivityIndicator />
        ) : !hasAnyPoints ? (
          <InformationalCard icon="chart-timeline-variant" marginBottom={0} style={utilitySurface}>
            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
              Seeding your ledger
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
              Open Home a few times across days so insights can snapshot your signal. Nothing is invented here — bars
              appear only from real persisted days.
            </Text>
          </InformationalCard>
        ) : (
          FACTORS.map((f) => {
            const points = seriesQ.data?.[f.key] ?? [];
            if (points.length === 0) return null;
            const color =
              f.colorKey === 'primary'
                ? theme.colors.primary
                : f.colorKey === 'secondary'
                  ? theme.colors.secondary
                  : theme.colors.tertiary;
            return (
              <InformationalCard key={f.key} marginBottom={0} style={[utilitySurface, reclaimSectionSpacing]}>
                <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: 8 }}>
                  {f.label}
                </Text>
                <SeriesBars values={points.map((p) => p.value)} color={color} />
                <Text variant="labelSmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                  {points.length} day{points.length === 1 ? '' : 's'} · {points[0]?.dayDate} →{' '}
                  {points[points.length - 1]?.dayDate}
                </Text>
              </InformationalCard>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
