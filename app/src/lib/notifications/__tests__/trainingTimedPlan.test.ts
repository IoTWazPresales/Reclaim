/**
 * Pure tests for timed training prompt reconcile planning (U2 grace + firedAt).
 */
import { describe, expect, it } from 'vitest';
import {
  TIMED_PROMPT_CANCEL_GRACE_MS,
  decideTrainingPromptPlan,
  trainingTimedPlanSignatureParts,
} from '@/lib/notifications/trainingTimedPlan';

const sessionId = 'sess-1';
const scheduledAt = '2026-07-24T10:00:00.000Z';
const fireMs = Date.parse(scheduledAt);

describe('decideTrainingPromptPlan (timed grace + firedAt)', () => {
  it('keeps future timed intents in the plan unchanged', () => {
    const nowMs = fireMs - 60_000;
    const decision = decideTrainingPromptPlan(
      {
        type: 'TRAINING_SET',
        sessionId,
        scheduledAt,
        title: 'Rest complete',
        body: 'Next set',
        issuedAt: 'iss-1',
      },
      { nowMs },
    );
    expect(decision.action).toBe('timed');
    if (decision.action !== 'timed') return;
    expect(decision.identifier).toBe('reclaim-training-at-sess-1');
    expect(decision.data.scheduledAt).toBe(scheduledAt);
    expect(decision.fireAt.toISOString()).toBe(scheduledAt);
  });

  it('keeps past-due timed intent inside grace with stable signature parts', () => {
    const nowMs = fireMs + 30_000; // 30s overdue — inside 10m grace
    expect(nowMs - fireMs).toBeLessThan(TIMED_PROMPT_CANCEL_GRACE_MS);

    const base = {
      type: 'TRAINING_SET' as const,
      sessionId,
      scheduledAt,
      title: 'Rest complete',
      body: 'Bench · Set 2',
      issuedAt: 'iss-1',
    };
    const beforeDue = decideTrainingPromptPlan(base, { nowMs: fireMs - 1 });
    const afterDue = decideTrainingPromptPlan(base, { nowMs });
    expect(beforeDue.action).toBe('timed');
    expect(afterDue.action).toBe('timed');
    if (beforeDue.action !== 'timed' || afterDue.action !== 'timed') return;

    const sigFuture = trainingTimedPlanSignatureParts({
      logicalKey: `training_at:${sessionId}`,
      title: beforeDue.title,
      body: beforeDue.body,
      channelId: beforeDue.channelId,
      categoryIdentifier: beforeDue.categoryIdentifier,
      identifier: beforeDue.identifier,
      data: beforeDue.data as { scheduledAt?: string },
    });
    const sigGrace = trainingTimedPlanSignatureParts({
      logicalKey: `training_at:${sessionId}`,
      title: afterDue.title,
      body: afterDue.body,
      channelId: afterDue.channelId,
      categoryIdentifier: afterDue.categoryIdentifier,
      identifier: afterDue.identifier,
      data: afterDue.data as { scheduledAt?: string },
    });
    expect(sigGrace).toBe(sigFuture);
    expect(sigGrace).toContain(`at:${scheduledAt}`);
    expect(afterDue.identifier).toBe(beforeDue.identifier);
  });

  it('excludes timed intent when firedAt is set (even inside grace)', () => {
    const nowMs = fireMs + 30_000;
    const decision = decideTrainingPromptPlan(
      {
        type: 'TRAINING_SET',
        sessionId,
        scheduledAt,
        firedAt: '2026-07-24T10:00:05.000Z',
        title: 'Rest complete',
        body: 'x',
      },
      { nowMs },
    );
    expect(decision).toEqual({ action: 'skip', reason: 'timed_firedAt' });
  });

  it('excludes timed intent beyond cancel grace', () => {
    const nowMs = fireMs + TIMED_PROMPT_CANCEL_GRACE_MS + 1;
    const decision = decideTrainingPromptPlan(
      {
        type: 'TRAINING_REST',
        sessionId,
        scheduledAt,
        title: 'Rest complete',
        body: 'x',
      },
      { nowMs },
    );
    expect(decision).toEqual({ action: 'skip', reason: 'timed_past_grace' });
  });
});

describe('decideTrainingPromptPlan (immediate firedAt regression)', () => {
  it('emits immediate plan when no scheduledAt and no firedAt', () => {
    const decision = decideTrainingPromptPlan({
      type: 'TRAINING_REST',
      sessionId,
      title: 'Rest started',
      body: '1:30 rest',
      issuedAt: 'iss-now',
    });
    expect(decision.action).toBe('immediate');
    if (decision.action !== 'immediate') return;
    expect(decision.identifier).toBe('reclaim-training-sess-1');
    expect(decision.trigger).toBeNull();
  });

  it('excludes immediate prompt when firedAt is set', () => {
    const decision = decideTrainingPromptPlan({
      type: 'TRAINING_SET',
      sessionId,
      firedAt: '2026-07-24T09:00:00.000Z',
      title: 'Next set',
      body: 'x',
    });
    expect(decision).toEqual({ action: 'skip', reason: 'immediate_firedAt' });
  });
});
