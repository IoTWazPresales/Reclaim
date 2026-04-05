import React, { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { createAlphaFeedbackReport } from '@/lib/api';
import { isFeedbackCaptureEnabled } from '@/lib/feedback/flags';
import { flushFeedbackQueue } from '@/lib/feedback/queue';
import { logger } from '@/lib/logger';

/**
 * Flushes any queued alpha feedback when capture is enabled.
 * In-app bug/report UI was removed post-alpha; Settings feedback uses a separate flow.
 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const enabled = isFeedbackCaptureEnabled();

  const flushQueued = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await flushFeedbackQueue(createAlphaFeedbackReport);
      if (result.flushed > 0) {
        logger.debug('[feedback] flushed queued reports', result);
      }
    } catch (error) {
      logger.debug('[feedback] queue flush skipped', error);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    flushQueued().catch((e) => {
      if (__DEV__) logger.debug('[FeedbackProvider]', e);
    });
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        flushQueued().catch((e) => {
          if (__DEV__) logger.debug('[FeedbackProvider]', e);
        });
      }
    });
    return () => sub.remove();
  }, [enabled, flushQueued]);

  return <>{children}</>;
}
