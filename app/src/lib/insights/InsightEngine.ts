// C:\Reclaim\app\src\lib\insights\InsightEngine.ts

import stableStringify from '@/lib/insights/utils/stableStringify';

/**
 * Supported operators for insight rule conditions.
 */
export type InsightOperator =
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'eq'
  | 'deltaLt'
  | 'deltaGt'
  | 'pctLt'
  | 'pctGt';

export type InsightFieldPath =
  | 'mood.last'
  | 'mood.deltaVsBaseline'
  | 'mood.trend3dPct'
  | 'sleep.lastNight.hours'
  | 'sleep.avg7d.hours'
  | 'sleep.midpoint.deltaMin'
  | 'steps.lastDay'
  | 'meds.adherencePct7d'
  | 'behavior.daysSinceSocial'
  | 'tags.contains'
  | 'tags.empty';

export type InsightCondition = {
  field: InsightFieldPath;
  op: InsightOperator;
  value?: any;
};

export type InsightRule = {
  id: string;
  // “scope” can come later; for now we’re using sourceTag relevance in screens
  sourceTag?: string;
  icon?: string;
  message: string;
  action?: string;
  why?: string;

  // Matching
  conditions?: InsightCondition[];

  // Optional metadata / tags
  tags?: string[]; // rule tags (not user tags)
  priority?: number; // higher wins
};

export type InsightContext = {
  // mood
  mood?: {
    last?: number | null;
    baseline?: number | null;
    deltaVsBaseline?: number | null;
    trend3dPct?: number | null;
  };

  // sleep
  sleep?: {
    lastNight?: { hours?: number | null } | null;
    avg7d?: { hours?: number | null } | null;
    midpoint?: { deltaMin?: number | null } | null;
  };

  // activity
  steps?: {
    lastDay?: number | null;
  };

  // meds
  meds?: {
    adherencePct7d?: number | null;
  };

  // behavior
  behavior?: {
    daysSinceSocial?: number | null;
  };

  // user tags
  tags?: string[] | null;
};

export type InsightExplain = {
  contextFingerprint: string;
  conditionActuals: Record<string, any>;
};

export type InsightMatch = {
  id: string;
  sourceTag?: string;
  icon?: string;
  message: string;
  action?: string;
  why?: string;
  matchedConditions?: InsightCondition[];
  explain?: InsightExplain;
  score?: number;
};

export type InsightFeedbackLatest = {
  created_at: string; // ISO
  helpful: boolean;
  reason?: string | null;
};

export type InsightFeedbackIndex = {
  fingerprint: string;
  getLatest: (insightId: string) => InsightFeedbackLatest | null;
};

export type EvaluatePolicyOptions = {
  now?: Date;
  feedback?: {
    index: InsightFeedbackIndex;
    // cooldown for helpful=false with any reason OTHER THAN not_relevant_now
    cooldownDays: number; // e.g. 7
    // cooldown for reason=not_relevant_now
    notRelevantMs: number; // e.g. 24h
  };
};

function clampNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeString(s: any): string {
  return String(s ?? '').trim();
}

function normalizeTag(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/^#/, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getByPath(ctx: InsightContext, path: InsightFieldPath): any {
  switch (path) {
    case 'mood.last':
      return ctx.mood?.last ?? null;
    case 'mood.deltaVsBaseline':
      return ctx.mood?.deltaVsBaseline ?? null;
    case 'mood.trend3dPct':
      return ctx.mood?.trend3dPct ?? null;

    case 'sleep.lastNight.hours':
      return ctx.sleep?.lastNight?.hours ?? null;
    case 'sleep.avg7d.hours':
      return ctx.sleep?.avg7d?.hours ?? null;
    case 'sleep.midpoint.deltaMin':
      return ctx.sleep?.midpoint?.deltaMin ?? null;

    case 'steps.lastDay':
      return ctx.steps?.lastDay ?? null;

    case 'meds.adherencePct7d':
      return ctx.meds?.adherencePct7d ?? null;

    case 'behavior.daysSinceSocial':
      return ctx.behavior?.daysSinceSocial ?? null;

    case 'tags.contains':
      return ctx.tags ?? null;

    case 'tags.empty':
      return ctx.tags ?? null;

    default:
      return null;
  }
}

function compare(op: InsightOperator, actualRaw: any, expectedRaw: any): boolean {
  // tags ops
  if (op === 'eq' && (expectedRaw === null || expectedRaw === undefined)) {
    return actualRaw === expectedRaw;
  }

  // Special tag ops
  if (op === 'eq' && Array.isArray(actualRaw) && Array.isArray(expectedRaw)) {
    return stableStringify(actualRaw) === stableStringify(expectedRaw);
  }

  // tags.contains: expected is a string tag
  if (op === 'eq' && typeof actualRaw === 'string' && typeof expectedRaw === 'string') {
    return normalizeString(actualRaw) === normalizeString(expectedRaw);
  }

  // numeric ops
  const actual = clampNumber(actualRaw);
  const expected = clampNumber(expectedRaw);

  if (op === 'eq') {
    // if numeric comparables exist, compare numerically, else fallback to string
    if (actual !== null && expected !== null) return actual === expected;
    return normalizeString(actualRaw) === normalizeString(expectedRaw);
  }

  if (op === 'lt') return actual !== null && expected !== null ? actual < expected : false;
  if (op === 'lte') return actual !== null && expected !== null ? actual <= expected : false;
  if (op === 'gt') return actual !== null && expected !== null ? actual > expected : false;
  if (op === 'gte') return actual !== null && expected !== null ? actual >= expected : false;

  // delta/pct ops assume actual is already a delta/pct value in context
  if (op === 'deltaLt') return actual !== null && expected !== null ? actual < expected : false;
  if (op === 'deltaGt') return actual !== null && expected !== null ? actual > expected : false;
  if (op === 'pctLt') return actual !== null && expected !== null ? actual < expected : false;
  if (op === 'pctGt') return actual !== null && expected !== null ? actual > expected : false;

  return false;
}

function evalCondition(ctx: InsightContext, cond: InsightCondition): { ok: boolean; actual: any } {
  const actual = getByPath(ctx, cond.field);

  // tags.contains: expect string tag
  if (cond.field === 'tags.contains') {
    const tags = Array.isArray(actual) ? actual : [];
    const needle = normalizeTag(String(cond.value ?? ''));
    if (!needle) return { ok: false, actual: tags };
    const ok = tags.map((t) => normalizeTag(String(t))).includes(needle);
    return { ok, actual: tags };
  }

  // tags.empty: true means no tags (or empty array)
  if (cond.field === 'tags.empty') {
    const tags = Array.isArray(actual) ? actual : [];
    const wantEmpty = !!cond.value;
    const isEmpty = tags.length === 0;
    return { ok: wantEmpty ? isEmpty : !isEmpty, actual: tags };
  }

  return { ok: compare(cond.op, actual, cond.value), actual };
}

function makeContextFingerprint(ctx: InsightContext): string {
  // Keep stable + small. Don’t include volatile timestamps, only values used by rules.
  const compact = {
    mood: ctx.mood ?? null,
    sleep: ctx.sleep ?? null,
    steps: ctx.steps ?? null,
    meds: ctx.meds ?? null,
    behavior: ctx.behavior ?? null,
    tags: Array.isArray(ctx.tags) ? ctx.tags.map((t) => normalizeTag(String(t))).sort() : [],
  };
  return stableStringify(compact);
}

function computeRuleScore(rule: InsightRule, matchedCount: number): number {
  const p = typeof rule.priority === 'number' ? rule.priority : 0;
  // matchedCount helps favor “more specific” rules if priorities tie
  return p * 1000 + matchedCount;
}

function isSuppressedByFeedback(insightId: string, opts?: EvaluatePolicyOptions): boolean {
  const feedback = opts?.feedback;
  if (!feedback?.index) return false;

  const latest = feedback.index.getLatest(insightId);
  if (!latest) return false;
  if (latest.helpful !== false) return false;

  const createdAtMs = latest.created_at ? new Date(latest.created_at).getTime() : NaN;
  if (!Number.isFinite(createdAtMs)) return false;

  const nowMs = (opts?.now ?? new Date()).getTime();
  const ageMs = nowMs - createdAtMs;

  if (ageMs < 0) return false; // clock skew safety

  // reason-specific cooldown
  if (latest.reason === 'not_relevant_now') {
    return ageMs < feedback.notRelevantMs;
  }

  // other helpful=false => cooldownDays
  const cooldownMs = Math.max(0, feedback.cooldownDays) * 24 * 60 * 60 * 1000;
  if (cooldownMs <= 0) return false;

  return ageMs < cooldownMs;
}

export function createInsightEngine(rules: InsightRule[]) {
  const _rules = Array.isArray(rules) ? rules.slice() : [];

  function evaluateAll(ctx: InsightContext, opts?: EvaluatePolicyOptions): InsightMatch[] {
    const contextFingerprint = makeContextFingerprint(ctx);

    const matches: InsightMatch[] = [];

    for (const rule of _rules) {
      const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];

      const conditionActuals: Record<string, any> = {};
      let ok = true;

      for (const cond of conditions) {
        const res = evalCondition(ctx, cond);
        conditionActuals[`${cond.field}:${cond.op}:${String(cond.value ?? '')}`] = res.actual;
        if (!res.ok) {
          ok = false;
          break;
        }
      }

      if (!ok) continue;

      const insightId = normalizeString(rule.id) || normalizeString(rule.sourceTag) || normalizeString(rule.message);
      if (!insightId) continue;

      const match: InsightMatch = {
        id: insightId,
        sourceTag: rule.sourceTag,
        icon: rule.icon,
        message: rule.message,
        action: rule.action,
        why: rule.why,
        matchedConditions: conditions,
        explain: {
          contextFingerprint,
          conditionActuals,
        },
      };

      match.score = computeRuleScore(rule, conditions.length);
      matches.push(match);
    }

    // Sort: higher score first; tie-breaker stable by id
    matches.sort((a, b) => {
      const sa = typeof a.score === 'number' ? a.score : 0;
      const sb = typeof b.score === 'number' ? b.score : 0;
      if (sb !== sa) return sb - sa;
      return String(a.id).localeCompare(String(b.id));
    });

    // Apply feedback policy suppression (ENGINE OWNED)
    if (opts?.feedback?.index) {
      return matches.filter((m) => !isSuppressedByFeedback(m.id, opts));
    }

    return matches;
  }

  function evaluateOne(ctx: InsightContext, opts?: EvaluatePolicyOptions): InsightMatch | null {
    const all = evaluateAll(ctx, opts);
    return all[0] ?? null;
  }

  return {
    evaluateAll,
    evaluateOne,
  };
}

export type InsightEngine = ReturnType<typeof createInsightEngine>;
