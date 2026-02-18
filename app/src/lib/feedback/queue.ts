import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';
import type { AlphaFeedbackPayload } from './types';

const FEEDBACK_QUEUE_KEY = '@reclaim/alpha_feedback_queue';

export async function loadFeedbackQueue(): Promise<AlphaFeedbackPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AlphaFeedbackPayload[]) : [];
  } catch (error) {
    logger.warn('[feedback] failed to load queue', error);
    return [];
  }
}

export async function saveFeedbackQueue(queue: AlphaFeedbackPayload[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    logger.warn('[feedback] failed to save queue', error);
  }
}

export async function enqueueFeedback(payload: AlphaFeedbackPayload): Promise<void> {
  const queue = await loadFeedbackQueue();
  queue.push({
    ...payload,
    queuedAt: payload.queuedAt ?? new Date().toISOString(),
  });
  await saveFeedbackQueue(queue);
}

export async function flushFeedbackQueue(
  sender: (payload: AlphaFeedbackPayload) => Promise<void>,
): Promise<{ flushed: number; remaining: number }> {
  const queue = await loadFeedbackQueue();
  if (!queue.length) return { flushed: 0, remaining: 0 };

  const remaining: AlphaFeedbackPayload[] = [];
  let flushed = 0;

  for (const payload of queue) {
    try {
      await sender(payload);
      flushed += 1;
    } catch (error) {
      remaining.push(payload);
      logger.warn('[feedback] queue flush item failed', error);
    }
  }

  await saveFeedbackQueue(remaining);
  return { flushed, remaining: remaining.length };
}
