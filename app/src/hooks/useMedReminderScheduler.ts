// C:\Reclaim\app\src\hooks\useMedReminderScheduler.ts
import { useCallback } from 'react';
import type { Med } from '@/lib/api';
import { upcomingDoseTimes } from '@/lib/api';
import { scheduleMedReminderActionable } from '@/hooks/useNotifications';

/**
 * Schedules actionable reminders for the next 24h for a single med.
 * NOTE: Your Med already stores a parsed schedule (item.schedule.times/days),
 * so we just use that directly — no CSV parsing needed.
 */
export function useMedReminderScheduler() {
  const scheduleForMed = useCallback(async (med: Med) => {
    if (!med?.id || !med?.name || !med?.schedule) return;

    // upcomingDoseTimes expects the parsed schedule object you already store
    const doses = upcomingDoseTimes(med.schedule, 24); // next 24 hours

    for (const doseTime of doses) {
      const at = new Date(doseTime as any);
      await scheduleMedReminderActionable({
        medId: med.id!,
        medName: med.name,
        doseLabel: med.dose,
        doseTimeISO: at.toISOString(),
      });
    }
  }, []);

  return { scheduleForMed };
}

// Optional default export if you prefer default importing
export default useMedReminderScheduler;
