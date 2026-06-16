// C:\Reclaim\app\src\hooks\useMedReminderScheduler.ts
import { useCallback } from 'react';
import { upcomingDoseTimes, isScheduledMed, type Med } from '@/lib/api';
import { scheduleMedReminderActionable } from '@/hooks/useNotifications';

/**
 * Schedules actionable reminders for the next 24h for a single med.
 * PRN/as-needed meds are skipped (`isScheduledMed`); only fixed schedules use times/days.
 */
export function useMedReminderScheduler() {
  const scheduleForMed = useCallback(async (med: Med) => {
    if (!med?.id || !med?.name) return;
    if (!isScheduledMed(med)) return;

    const doses = upcomingDoseTimes(med.schedule as { times: string[]; days: number[] }, 4);

    for (const doseTime of doses) {
      const at = new Date(doseTime as any);
      await scheduleMedReminderActionable({
        medId: med.id!,
        medName: med.name,
        doseTimeISO: at.toISOString(),
        body: med.dose ? `Dose: ${med.dose}` : undefined,
      });
    }
  }, []);

  return { scheduleForMed };
}

// Optional default export if you prefer default importing
export default useMedReminderScheduler;
