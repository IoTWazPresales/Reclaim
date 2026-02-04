// C:\Reclaim\app\src\hooks\useMedReminderScheduler.ts
import { useCallback } from 'react';
import { upcomingDoseTimes, type Med } from '@/lib/api';
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
    // PHASE 4 FIX: Reduced cap from 8 to 4 to stay well under Android practical limit (~50-100)
    // With 4 doses per med, total notifications stay manageable even with 10+ meds
    // iOS 64 limit: 4 doses × 10 meds = 40 + ~10 other notifications = 50 total (safe)
    const doses = upcomingDoseTimes(med.schedule, 4);

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
