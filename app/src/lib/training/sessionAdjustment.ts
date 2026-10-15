import type { QueryClient } from '@tanstack/react-query';
import { updateItemAutoregulationAdjustments } from '@/lib/api';
import type { AppliedAdjustment } from './autoregulationOverlay';
import { patchSessionQuery } from './sessionQueryPatch';

/** Publish a saved overlay to the phone cache; failure leaves the previous target intact. */
export async function persistAppliedSessionAdjustment(
  qc: QueryClient,
  sessionId: string,
  itemId: string,
  adjustment: AppliedAdjustment,
): Promise<void> {
  await updateItemAutoregulationAdjustments(itemId, adjustment.setIndex, adjustment.overlay);
  patchSessionQuery(qc, sessionId, prev => ({
    ...prev,
    items: prev.items.map(item => item.id !== itemId ? item : ({
      ...item,
      autoregulation_adjustments: {
        ...item.autoregulation_adjustments,
        [adjustment.setIndex]: { ...adjustment.overlay, appliedAt: new Date().toISOString() },
      },
    })),
  }));
}
