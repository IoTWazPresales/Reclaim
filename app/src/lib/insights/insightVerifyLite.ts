/**
 * Verify-lite: after an insight action executes, remember the match locally.
 * On a later context refresh, if those conditions no longer hold, surface a short acknowledgment.
 * Local-only — no schema / no notifications.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';
import {
  conditionsMatchContext,
  type InsightCondition,
  type InsightContext,
  type InsightMatch,
} from '@/lib/insights/InsightEngine';
import type { InsightActionIntent } from '@/lib/insights/insightActions';

const STORAGE_PREFIX = '@reclaim/insights:verifyLite:v1';
const PENDING_TTL_MS = 72 * 60 * 60 * 1000;
/** Ignore the immediate post-action refresh so we don't ack before the user leaves/returns. */
const MIN_AGE_BEFORE_EVAL_MS = 90 * 1000;

export type InsightVerifyPending = {
  insightId: string;
  intent: InsightActionIntent | string;
  message: string;
  executedAt: number;
  matchedConditions: InsightCondition[];
};

export type InsightVerifyEval =
  | { status: 'none' }
  | { status: 'pending_too_soon' }
  | { status: 'still_active'; pending: InsightVerifyPending }
  | { status: 'expired' }
  | { status: 'cleared'; pending: InsightVerifyPending; acknowledgment: string };

function storageKey(userId: string | null | undefined): string {
  return `${STORAGE_PREFIX}:${userId || 'anon'}`;
}

const INTENT_ACK: Record<string, string> = {
  open_training: 'Training follow-up landed — that training signal looks clearer in today’s read.',
  open_sleep: 'Sleep follow-up landed — that sleep signal looks clearer in today’s read.',
  open_mood_checkin: 'Check-in follow-up landed — that mood signal looks clearer in today’s read.',
  open_meditation: 'Breathing follow-up landed — that stress signal looks clearer in today’s read.',
  open_meds_today: 'Meds follow-up landed — that adherence signal looks clearer in today’s read.',
  open_analytics: 'Trends follow-up landed — that pattern looks clearer in today’s read.',
};

export function acknowledgmentForPending(pending: InsightVerifyPending): string {
  const fromIntent = INTENT_ACK[String(pending.intent)];
  if (fromIntent) return fromIntent;
  const short = String(pending.message || '')
    .trim()
    .slice(0, 48);
  if (short) return `Follow-up landed — “${short}${pending.message.length > 48 ? '…' : ''}” looks clearer now.`;
  return 'Follow-up landed — that earlier signal looks clearer in today’s read.';
}

export async function recordInsightActionForVerifyLite(args: {
  userId: string | null | undefined;
  match: Pick<InsightMatch, 'id' | 'message' | 'matchedConditions'>;
  intent: string;
  nowTs?: number;
}): Promise<void> {
  const { userId, match, intent } = args;
  const nowTs = args.nowTs ?? Date.now();
  const conditions = Array.isArray(match.matchedConditions) ? match.matchedConditions : [];
  if (!match.id || conditions.length === 0) {
    if (__DEV__) logger.debug('[verifyLite] skip record — missing id or conditions', { id: match.id });
    return;
  }

  const pending: InsightVerifyPending = {
    insightId: match.id,
    intent,
    message: String(match.message ?? ''),
    executedAt: nowTs,
    matchedConditions: conditions,
  };

  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(pending));
  } catch (e) {
    if (__DEV__) logger.debug('[verifyLite] record failed', e);
  }
}

export async function loadInsightVerifyPending(
  userId: string | null | undefined,
): Promise<InsightVerifyPending | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InsightVerifyPending;
    if (!parsed?.insightId || !Array.isArray(parsed.matchedConditions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearInsightVerifyPending(userId: string | null | undefined): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch (e) {
    if (__DEV__) logger.debug('[verifyLite] clear failed', e);
  }
}

/**
 * Pure evaluation (testable). Caller owns persistence / telemetry.
 */
export function evaluateInsightVerifyLite(args: {
  pending: InsightVerifyPending | null;
  context: InsightContext | null | undefined;
  nowTs?: number;
  minAgeMs?: number;
  ttlMs?: number;
}): InsightVerifyEval {
  const pending = args.pending;
  if (!pending) return { status: 'none' };

  const nowTs = args.nowTs ?? Date.now();
  const ttlMs = args.ttlMs ?? PENDING_TTL_MS;
  const minAgeMs = args.minAgeMs ?? MIN_AGE_BEFORE_EVAL_MS;
  const age = nowTs - pending.executedAt;

  if (age < 0 || age > ttlMs) return { status: 'expired' };
  if (age < minAgeMs) return { status: 'pending_too_soon' };
  if (!args.context) return { status: 'pending_too_soon' };

  const stillActive = conditionsMatchContext(args.context, pending.matchedConditions);
  if (stillActive) return { status: 'still_active', pending };

  return {
    status: 'cleared',
    pending,
    acknowledgment: acknowledgmentForPending(pending),
  };
}
