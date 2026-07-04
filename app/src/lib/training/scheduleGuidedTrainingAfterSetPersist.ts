/**
 * After a set is persisted, load session from DB and schedule the session's
 * notification prompts from derived pending work (DB SSOT).
 *
 * Notifications are dumb triggers: sessionId + action verb + display strings.
 * Display strings are rebuilt from the DB chain on every transition — there is
 * no payload lookahead to go stale.
 */

import { getTrainingSession, type TrainingSessionItemRow } from '@/lib/api';
import { computeRestSecondsAfterCompletingSet } from '@/lib/training/guidedSetCompletionCanonical';
import {
  clearTrainingIntentsForSession,
  clearTrainingTimedPrompt,
  scheduleTrainingNowPrompt,
  scheduleTrainingTimedPrompt,
  trainingNowIntentKey,
  trainingTimedIntentKey,
} from '@/lib/notifications/trainingNotificationScheduler';
import { logger } from '@/lib/logger';
import { hasIntent } from '@/lib/notifications/NotificationIntentStore';
import { getExerciseById } from '@/lib/training/engine';
import { formatPlannedSetSummary } from '@/lib/training/loadDisplayFormat';
import {
  buildNotificationWorkChain,
  type NotificationWorkChain,
  type TrainingNotificationNext,
} from '@/lib/training/trainingNotificationWorkPlan';

export type ScheduleGuidedTrainingAfterSetPersistInput = {
  sessionId: string;
  completedSessionItemId: string;
  completedSetIndex: number;
  rpe?: number;
};

export type ScheduleGuidedTrainingAfterSetPersistResult = {
  restSecondsAfterCompleted: number;
  sessionComplete: boolean;
  nextSetIndex: number | null;
  nextExerciseId: string | null;
  nextSessionItemId: string | null;
};

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.max(0, totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** "Bench Press • Set 2 • 60kg · 8 reps" (bodyweight-aware, never "0kg"). */
export function formatSetPromptBody(next: NonNullable<TrainingNotificationNext>): string {
  const parts = [`${next.exerciseName} • Set ${next.setIndex}`];
  const exercise = getExerciseById(next.exerciseId);
  if (next.targetReps != null) {
    if (exercise && Array.isArray((exercise as { intents?: unknown }).intents)) {
      parts.push(
        formatPlannedSetSummary(exercise, {
          targetReps: next.targetReps,
          suggestedWeight: next.suggestedWeight ?? 0,
        }),
      );
    } else if (next.suggestedWeight && next.suggestedWeight > 0) {
      parts.push(`${next.suggestedWeight}kg · ${next.targetReps} reps`);
    } else {
      parts.push(`${next.targetReps} reps`);
    }
  }
  return parts.join(' • ');
}

export async function scheduleGuidedTrainingAfterSetPersist(
  input: ScheduleGuidedTrainingAfterSetPersistInput,
  options?: { deferReconcile?: boolean },
): Promise<ScheduleGuidedTrainingAfterSetPersistResult> {
  const { session, items } = await getTrainingSession(input.sessionId);
  void session;

  const completedItem = items.find((i) => i.id === input.completedSessionItemId);
  const chain = buildNotificationWorkChain(items);

  const restSecondsAfterCompleted = chain.sessionComplete
    ? 0
    : computeRestSecondsAfterCompletingSet(
        completedItem?.planned?.sets,
        input.completedSetIndex,
        input.rpe,
      );

  if (chain.sessionComplete || !chain.next) {
    logger.debug('[GUIDED_SCHEDULE] session complete after persist — clearing prompts', {
      sessionId: input.sessionId,
      completedSetIndex: input.completedSetIndex,
    });
    await clearTrainingIntentsForSession(input.sessionId);
    return {
      restSecondsAfterCompleted: 0,
      sessionComplete: true,
      nextSetIndex: null,
      nextExerciseId: null,
      nextSessionItemId: null,
    };
  }

  const scheduleOpts = { deferReconcile: options?.deferReconcile ?? true };

  if (restSecondsAfterCompleted > 0) {
    const restEndsAtMs = Date.now() + restSecondsAfterCompleted * 1000;
    await scheduleTrainingNowPrompt(
      {
        sessionId: input.sessionId,
        kind: 'rest',
        title: 'Rest started',
        body: `${chain.next.exerciseName} • ${formatClock(restSecondsAfterCompleted)} rest • Set ${chain.next.setIndex} next`,
        restEndsAtMs,
      },
      scheduleOpts,
    );
    await scheduleTrainingTimedPrompt(
      {
        sessionId: input.sessionId,
        kind: 'set',
        title: 'Rest complete',
        body: formatSetPromptBody(chain.next),
        fireAtMs: restEndsAtMs,
      },
      scheduleOpts,
    );
  } else {
    await clearTrainingTimedPrompt(input.sessionId);
    await scheduleTrainingNowPrompt(
      {
        sessionId: input.sessionId,
        kind: 'set',
        title: 'Next set',
        body: formatSetPromptBody(chain.next),
      },
      scheduleOpts,
    );
  }

  return {
    restSecondsAfterCompleted,
    sessionComplete: false,
    nextSetIndex: chain.next.setIndex,
    nextExerciseId: chain.next.exerciseId,
    nextSessionItemId: chain.next.sessionItemId,
  };
}

/** Load pending work chain from persisted session (DB SSOT). */
export async function loadGuidedTrainingNotificationWorkChain(
  sessionId: string,
): Promise<NotificationWorkChain> {
  const { items } = await getTrainingSession(sessionId);
  return buildNotificationWorkChain(items);
}

/**
 * After rest is skipped (NEXT_SET), replace the prompts with an immediate
 * set prompt from DB-derived pending work.
 */
export async function scheduleGuidedTrainingNextSetFromDb(
  sessionId: string,
  options?: { deferReconcile?: boolean; chain?: NotificationWorkChain },
): Promise<ScheduleGuidedTrainingAfterSetPersistResult> {
  const chain = options?.chain ?? (await loadGuidedTrainingNotificationWorkChain(sessionId));

  if (chain.sessionComplete || !chain.next) {
    logger.debug('[GUIDED_SCHEDULE] NEXT_SET — session complete, no pending set', { sessionId });
    await clearTrainingIntentsForSession(sessionId);
    return {
      restSecondsAfterCompleted: 0,
      sessionComplete: true,
      nextSetIndex: null,
      nextExerciseId: null,
      nextSessionItemId: null,
    };
  }

  await clearTrainingTimedPrompt(sessionId);

  await scheduleTrainingNowPrompt(
    {
      sessionId,
      kind: 'set',
      title: 'Next set',
      body: formatSetPromptBody(chain.next),
    },
    { deferReconcile: options?.deferReconcile ?? true },
  );

  logger.debug('[GUIDED_SCHEDULE] NEXT_SET immediate set prompt from DB chain', {
    sessionId,
    exerciseId: chain.next.exerciseId,
    setIndex: chain.next.setIndex,
  });

  return {
    restSecondsAfterCompleted: 0,
    sessionComplete: false,
    nextSetIndex: chain.next.setIndex,
    nextExerciseId: chain.next.exerciseId,
    nextSessionItemId: chain.next.sessionItemId,
  };
}

/** Reschedule the rest-end prompt after in-app rest extend (DB-derived chain). */
export async function rescheduleGuidedTrainingPendingSetNotification(
  sessionId: string,
  remainingSeconds: number,
  options?: { deferReconcile?: boolean; chain?: NotificationWorkChain },
): Promise<string | null> {
  const chain = options?.chain ?? (await loadGuidedTrainingNotificationWorkChain(sessionId));
  if (chain.sessionComplete || !chain.next) return null;

  const key = await scheduleTrainingTimedPrompt(
    {
      sessionId,
      kind: 'set',
      title: 'Rest complete',
      body: formatSetPromptBody(chain.next),
      fireAtMs: Date.now() + Math.max(1, Math.floor(remainingSeconds)) * 1000,
    },
    { deferReconcile: options?.deferReconcile ?? true },
  );

  logger.debug('[GUIDED_SCHEDULE] rescheduled rest-end prompt', {
    sessionId,
    exerciseId: chain.next.exerciseId,
    setIndex: chain.next.setIndex,
    remainingSeconds,
  });

  return key;
}

export type ScheduleGuidedTrainingSessionStartResult = {
  scheduled: boolean;
  sessionComplete: boolean;
  firstSetIndex: number | null;
  firstExerciseId: string | null;
};

/**
 * Schedule the first-set prompt from DB session items — not plan walk or synthetic IDs.
 * With `delaySeconds` the prompt fires from the OS at an absolute time (prep countdown).
 */
export async function scheduleGuidedTrainingSessionStart(
  sessionId: string,
  options?: {
    deferReconcile?: boolean;
    delaySeconds?: number;
    chain?: NotificationWorkChain;
    items?: TrainingSessionItemRow[];
    skipIfIntentExists?: boolean;
  },
): Promise<ScheduleGuidedTrainingSessionStartResult> {
  let items = options?.items;
  let chain = options?.chain;
  if (!items || !chain) {
    const loaded = await getTrainingSession(sessionId);
    items = loaded.items;
    chain = buildNotificationWorkChain(items);
  }

  if (chain.sessionComplete || !chain.next) {
    logger.debug('[GUIDED_SCHEDULE] session start — no pending work', { sessionId });
    return {
      scheduled: false,
      sessionComplete: true,
      firstSetIndex: null,
      firstExerciseId: null,
    };
  }

  const first = chain.next;

  if (options?.skipIfIntentExists !== false) {
    try {
      if (
        (await hasIntent(trainingNowIntentKey(sessionId))) ||
        (await hasIntent(trainingTimedIntentKey(sessionId)))
      ) {
        logger.debug('[GUIDED_SCHEDULE] session start skipped — prompt already exists', {
          sessionId,
          exerciseId: first.exerciseId,
          setIndex: first.setIndex,
        });
        return {
          scheduled: false,
          sessionComplete: false,
          firstSetIndex: first.setIndex,
          firstExerciseId: first.exerciseId,
        };
      }
    } catch {
      // non-blocking — proceed to schedule
    }
  }

  const delay = options?.delaySeconds ?? 0;
  const scheduleOpts = { deferReconcile: options?.deferReconcile ?? true };

  if (delay > 0) {
    await scheduleTrainingTimedPrompt(
      {
        sessionId,
        kind: 'set',
        title: 'Session started',
        body: formatSetPromptBody(first),
        fireAtMs: Date.now() + delay * 1000,
      },
      scheduleOpts,
    );
  } else {
    await scheduleTrainingNowPrompt(
      {
        sessionId,
        kind: 'set',
        title: 'Session started',
        body: formatSetPromptBody(first),
      },
      scheduleOpts,
    );
  }

  logger.debug('[GUIDED_SCHEDULE] session start first set from DB', {
    sessionId,
    exerciseId: first.exerciseId,
    setIndex: first.setIndex,
    delaySeconds: options?.delaySeconds,
  });

  return {
    scheduled: true,
    sessionComplete: false,
    firstSetIndex: first.setIndex,
    firstExerciseId: first.exerciseId,
  };
}
