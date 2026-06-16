import React from 'react';
import { Portal } from 'react-native-paper';

import { ScheduleOverlay, type ScheduleOverlayItem } from '@/components/dashboard/ScheduleOverlay';

type DashboardScheduleOverlayHostProps = {
  open: boolean;
  onClose: () => void;
  items: ScheduleOverlayItem[];
  onTakeDose: (medId: string, scheduledISO: string) => void;
};

export function DashboardScheduleOverlayHost({
  open,
  onClose,
  items,
  onTakeDose,
}: DashboardScheduleOverlayHostProps) {
  return (
    <Portal>
      <ScheduleOverlay
        {...({
          open,
          onClose,
          items,
          title: 'Schedule',
          onTakeDose,
        } as any)}
      />
    </Portal>
  );
}
