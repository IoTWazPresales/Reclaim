import React from 'react';
import { View } from 'react-native';
import { FirstVisitCoach } from '@/components/ui/FirstVisitCoach';
import { reclaimSectionSpacing } from '@/theme/reclaimScreenLayout';

type Props = {
  guideVisible: boolean;
  medications: readonly unknown[] | undefined;
  status: 'pending' | 'error' | 'success';
  isFetching: boolean;
  onShowMe: () => void;
  onDismiss: () => void;
  style?: object;
};

export function MedsFirstVisitCoach({ guideVisible, medications, status, isFetching,
  onShowMe, onDismiss, style }: Props) {
  if (!guideVisible || status !== 'success' || isFetching ||
      !Array.isArray(medications) || medications.length !== 0) return null;

  return (
    <View style={reclaimSectionSpacing}>
      <FirstVisitCoach
        visible
        message="Add a med to unlock reminders and adherence. Reclaim never judges effectiveness."
        showMeLabel="Show me"
        onShowMe={onShowMe}
        onDismiss={onDismiss}
        style={style}
      />
    </View>
  );
}
