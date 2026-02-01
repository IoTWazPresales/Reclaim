/**
 * Wearables Projection Service - projects domain state to glance models.
 * Read-only: takes DomainSnapshot, produces WearableGlanceModel cards.
 * No DB queries, no platform-specific code.
 */

import { buildSessionFromProgramDay } from '@/lib/training/engine';
import type { MovementIntent, SessionTemplate } from '@/lib/training/types';
import { logger } from '@/lib/logger';
import type { DomainSnapshot, TrainingNextActionCard } from './models';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateForWatch(date: Date): string {
  const day = DAY_NAMES[date.getDay()];
  const d = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  return `${day} ${d} ${month}`;
}

/**
 * Project domain snapshot to TrainingNextActionCard.
 * Returns the next scheduled session (first program day >= today).
 */
export function projectTrainingNextAction(snapshot: DomainSnapshot): TrainingNextActionCard | null {
  if (!snapshot.programDays || snapshot.programDays.length === 0) {
    logger.debug('[WEAR_PROJ] No program days, skipping TrainingNextActionCard');
    return null;
  }
  if (!snapshot.activeProgram?.profile_snapshot) {
    logger.debug('[WEAR_PROJ] No active program or profile snapshot');
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...snapshot.programDays]
    .filter((pd) => {
      const pdDate = new Date(pd.date);
      pdDate.setHours(0, 0, 0, 0);
      return pdDate >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    logger.debug('[WEAR_PROJ] No upcoming program days');
    return null;
  }

  const nextDay = sorted[0];
  try {
    const plan = buildSessionFromProgramDay(
      {
        label: nextDay.label,
        intents: (nextDay.intents || []) as MovementIntent[],
        template_key: nextDay.template_key as SessionTemplate,
      },
      snapshot.activeProgram.profile_snapshot,
    );

    const sessionDate = new Date(nextDay.date);
    const card: TrainingNextActionCard = {
      type: 'training_next_action',
      label: nextDay.label,
      date: nextDay.date,
      dateDisplay: formatDateForWatch(sessionDate),
      templateKey: nextDay.template_key,
      estimatedMinutes: plan.estimatedDurationMinutes ?? 60,
    };

    logger.debug('[WEAR_PROJ] TrainingNextActionCard', {
      label: card.label,
      date: card.date,
      templateKey: card.templateKey,
    });

    return card;
  } catch (error) {
    logger.warn('[WEAR_PROJ] Failed to build TrainingNextActionCard', { error, nextDay });
    return null;
  }
}
