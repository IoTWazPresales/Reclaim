/**
 * Typed insight action intents — resolve rule `actionIntent` to CTA kind + label.
 * Pure module: no React, no navigation imports.
 */
import { logger } from '@/lib/logger';
import type { InsightMatch } from '@/lib/insights/InsightEngine';

export type InsightActionKind = 'navigate' | 'log' | 'none';

export type InsightActionIntent =
  | 'open_training'
  | 'open_sleep'
  | 'open_mood_checkin'
  | 'open_meditation'
  | 'open_meds_today'
  | 'open_analytics'
  | 'advice_only';

export type ResolvedInsightAction = {
  intent: InsightActionIntent;
  kind: InsightActionKind;
  ctaLabel: string;
};

const INTENT_META: Record<
  Exclude<InsightActionIntent, 'advice_only'>,
  { kind: InsightActionKind; ctaLabel: string }
> = {
  open_training: { kind: 'navigate', ctaLabel: 'Open training' },
  open_sleep: { kind: 'navigate', ctaLabel: 'Open sleep' },
  open_mood_checkin: { kind: 'log', ctaLabel: 'Check in' },
  open_meditation: { kind: 'navigate', ctaLabel: 'Breathe now' },
  open_meds_today: { kind: 'navigate', ctaLabel: 'Open meds' },
  open_analytics: { kind: 'navigate', ctaLabel: 'See trends' },
};

const KNOWN = new Set<string>(Object.keys(INTENT_META));

export function resolveInsightAction(
  match: Pick<InsightMatch, 'actionIntent' | 'action'>,
): ResolvedInsightAction {
  const raw = typeof match.actionIntent === 'string' ? match.actionIntent.trim() : '';
  if (!raw || raw === 'advice_only') {
    return { intent: 'advice_only', kind: 'none', ctaLabel: '' };
  }
  if (KNOWN.has(raw)) {
    const intent = raw as Exclude<InsightActionIntent, 'advice_only'>;
    const meta = INTENT_META[intent];
    return { intent, kind: meta.kind, ctaLabel: meta.ctaLabel };
  }
  if (__DEV__) {
    logger.debug('[insightActions] unknown actionIntent', { actionIntent: raw });
  }
  return { intent: 'advice_only', kind: 'none', ctaLabel: '' };
}

/** True when the insight should render an executable primary CTA (not advice-only, not empty). */
export function insightHasExecutableAction(
  match: Pick<InsightMatch, 'actionIntent' | 'action' | 'id'>,
): boolean {
  // Crisis lifeline keeps a dedicated CTA outside the intent vocabulary.
  if (match.id === 'mood-sustained-low') return true;
  const resolved = resolveInsightAction(match);
  return resolved.kind !== 'none' && resolved.ctaLabel.length > 0;
}
