import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { InformationalCard } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { reclaimUtilityCardSurface, reclaimPrimaryCapsuleButton } from '@/theme/reclaimVisualLanguage';
import { useAuth } from '@/providers/AuthProvider';
import { getUserSettings } from '@/lib/userSettings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EVENING_WIND_DOWN,
  ensureEveningWindDownAssignment,
  experimentDayProgress,
  logEveningWindDownCompletion,
  type ExperimentAssignment,
} from '@/lib/experiments/behavioralExperiment';
import { formatLocalDateYYYYMMDD } from '@/lib/training/dateUtils';

/** Home card for the opt-in evening wind-down experiment (U5). Hidden when experimentsEnabled is false. */
export function DashboardExperimentCard() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const qc = useQueryClient();
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme), [appTheme]);
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const [assignment, setAssignment] = useState<ExperimentAssignment | null>(null);
  const [busy, setBusy] = useState(false);

  const settingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  const enabled = settingsQ.data?.experimentsEnabled === true;

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !userId) {
      setAssignment(null);
      return;
    }
    ensureEveningWindDownAssignment(userId)
      .then((a) => {
        if (!cancelled) setAssignment(a);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  const progress = assignment ? experimentDayProgress(assignment) : null;
  const today = formatLocalDateYYYYMMDD(new Date());
  const doneToday = assignment?.completions.includes(today) ?? false;

  const onComplete = useCallback(async () => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const next = await logEveningWindDownCompletion(userId, today);
      if (next) setAssignment(next);
      await qc.invalidateQueries({ queryKey: ['user:settings'] });
    } finally {
      setBusy(false);
    }
  }, [userId, busy, today, qc]);

  if (!enabled || !assignment || !progress) return null;

  return (
    <InformationalCard icon="moon-waning-crescent" marginBottom={0} style={utilitySurface}>
      <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
        {EVENING_WIND_DOWN.title}
      </Text>
      <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
        {EVENING_WIND_DOWN.prompt}
      </Text>
      <Text variant="labelMedium" style={{ marginTop: 10, color: theme.colors.primary, fontWeight: '600' }}>
        Day {progress.dayNumber} of {EVENING_WIND_DOWN.durationDays} · {progress.completionCount} logged
      </Text>
      <View style={{ marginTop: 12 }}>
        <Button
          mode="contained"
          onPress={() => void onComplete()}
          disabled={doneToday || busy}
          buttonColor={theme.colors.primary}
          textColor={theme.colors.onPrimary}
          style={primaryCapsule.style}
          contentStyle={primaryCapsule.contentStyle}
          labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
          accessibilityLabel="Log wind-down for today"
        >
          {doneToday ? 'Logged for today' : 'I did tonight’s wind-down'}
        </Button>
      </View>
    </InformationalCard>
  );
}
