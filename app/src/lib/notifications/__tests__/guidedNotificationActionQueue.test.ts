import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NotificationResponse } from 'expo-notifications';

const store = vi.hoisted(() => {
  const map = new Map<string, string>();
  return {
    getItem: vi.fn(async (k: string) => map.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      map.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      map.delete(k);
    }),
    clear: () => map.clear(),
  };
});

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: (...args: unknown[]) => store.getItem(...(args as [string])),
    setItem: (...args: unknown[]) => store.setItem(...(args as [string, string])),
    removeItem: (...args: unknown[]) => store.removeItem(...(args as [string])),
  },
}));

import {
  enqueueGuidedNotificationAction,
  drainGuidedNotificationActionQueue,
  clearGuidedNotificationActionQueue,
  peekGuidedNotificationActionQueue,
  serializeGuidedNotificationResponse,
} from '@/lib/notifications/guidedNotificationActionQueue';

function makeResponse(
  action: string,
  opts: { id?: string; type?: string; issuedAt?: string; setIndex?: number } = {},
): NotificationResponse {
  const issuedAt = opts.issuedAt ?? '2026-07-21T10:00:00.000Z';
  return {
    actionIdentifier: action,
    notification: {
      date: Date.now(),
      request: {
        identifier: opts.id ?? 'reclaim-training-sess-1',
        content: {
          title: 'Set',
          body: 'Do it',
          data: {
            type: opts.type ?? 'TRAINING_SET',
            sessionId: 'sess-1',
            issuedAt,
            setIndex: opts.setIndex ?? 1,
          },
          sound: null,
        },
        trigger: null,
      },
    },
  } as unknown as NotificationResponse;
}

describe('guidedNotificationActionQueue', () => {
  beforeEach(async () => {
    store.clear();
    vi.clearAllMocks();
    await clearGuidedNotificationActionQueue();
  });

  it('serializes guided SET_DONE and skips default body tap', () => {
    const done = serializeGuidedNotificationResponse(makeResponse('SET_DONE'));
    expect(done?.queueId).toContain('SET_DONE');
    expect(serializeGuidedNotificationResponse(makeResponse('expo.modules.notifications.actions.DEFAULT'))).toBeNull();
  });

  it('enqueues unique actions and drains FIFO in order', async () => {
    const a = makeResponse('SET_DONE', { issuedAt: 't1', setIndex: 1 });
    const b = makeResponse('SET_DONE', { issuedAt: 't2', setIndex: 2 });
    await enqueueGuidedNotificationAction(a);
    await enqueueGuidedNotificationAction(b);
    await enqueueGuidedNotificationAction(a); // duplicate

    const peek = await peekGuidedNotificationActionQueue();
    expect(peek).toHaveLength(2);

    const order: string[] = [];
    await drainGuidedNotificationActionQueue(async (r) => {
      order.push(String((r.notification.request.content.data as any).issuedAt));
    });

    expect(order).toEqual(['t1', 't2']);
    expect(await peekGuidedNotificationActionQueue()).toHaveLength(0);
  });

  it('leaves head on process failure for retry', async () => {
    await enqueueGuidedNotificationAction(makeResponse('SET_DONE', { issuedAt: 'fail-me' }));
    const result = await drainGuidedNotificationActionQueue(async () => {
      throw new Error('boom');
    });
    expect(result.failed).toBe(1);
    expect(await peekGuidedNotificationActionQueue()).toHaveLength(1);
  });
});
