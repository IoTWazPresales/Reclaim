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

export type ScreenScope = 'sleep' | 'mood' | 'meds' | 'dashboard' | 'global';

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
  | 'tags.empty'
  | 'tags.count'
  | 'flags.stress';

export type InsightCondition = {
  field: InsightFieldPath;
  op: InsightOperator;
  value: any;
};

type InsightConditionInput =
  | InsightCondition
  | {
      field: InsightFieldPath;
      operator: InsightOperator; // JSON compatibility
      value: any;
    };

export type InsightRule = {
  id: string;
  priority?: number;
  scopes?: ScreenScope[]; // ✅ new (preferred)
  scope?: ScreenScope; // legacy single scope (optional)
  sourceTag?: string;
  icon?: string;
  message: string;
  action?: string;
  why?: string;

  // Engine-native:
  conditions?: InsightCondition[];

  // JSON compatibility (your current file):
  condition?: InsightConditionInput[];
};

export type InsightContext = {
  mood?: {
    last?: number;
    deltaVsBaseline?: number;
    trend3dPct?: number;
  };
  sleep?: {
    lastNight?: { hours?: number };
    avg7d?: { hours?: number };
    midpoint?: { deltaMin?: number };
  };
  steps?: { lastDay?: number };
  meds?: { adherencePct7d?: number };
  behavior?: { daysSinceSocial?: number };
  tags: string[];

  // ✅ new (contextBuilder already produces this)
  flags?: {
    stress?: boolean;
  };
};

export type InsightMatch = {
  id: string;
  priority: number;
  message: string;
  action?: string;
  why?: string;
  icon?: string;
  sourceTag?: string;

  // ✅ new
  scopes?: ScreenScope[];

  matchedConditions: InsightCondition[];
  explain?: Record<string, any>;
};

function getByPath(ctx: InsightContext, path: InsightFieldPath): any {
  switch (path) {
    case 'mood.last':
      return ctx.mood?.last;
    case 'mood.deltaVsBaseline':
      return ctx.mood?.deltaVsBaseline;
    case 'mood.trend3dPct':
      return ctx.mood?.trend3dPct;

    case 'sleep.lastNight.hours':
      return ctx.sleep?.lastNight?.hours;
    case 'sleep.avg7d.hours':
      return ctx.sleep?.avg7d?.hours;
    case 'sleep.midpoint.deltaMin':
      return ctx.sleep?.midpoint?.deltaMin;

    case 'steps.lastDay':
      return ctx.steps?.lastDay;

    case 'meds.adherencePct7d':
      return ctx.meds?.adherencePct7d;

    case 'behavior.daysSinceSocial':
      return ctx.behavior?.daysSinceSocial;

    case 'tags.contains':
      return ctx.tags;
    case 'tags.empty':
      return (ctx.tags?.length ?? 0) === 0;
    case 'tags.count':
      return ctx.tags?.length ?? 0;

    case 'flags.stress':
      return !!ctx.flags?.stress;

    default:
      return undefined;
  }
}

function compare(op: InsightOperator, actual: any, expected: any): boolean {
  if (actual === undefined || actual === null) return false;

  switch (op) {
    case 'lt':
      return Number(actual) < Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'gt':
      return Number(actual) > Number(expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'eq':
      return actual === expected;

    case 'deltaLt':
    case 'deltaGt':
      return op === 'deltaLt' ? Number(actual) < Number(expected) : Number(actual) > Number(expected);

    case 'pctLt':
      return Number(actual) < Number(expected);
    case 'pctGt':
      return Number(actual) > Number(expected);

    default:
      return false;
  }
}

function normalizeCondition(input: any): InsightCondition | null {
  if (!input) return null;
  const field = input.field as InsightFieldPath;
  const op = (input.op ?? input.operator) as InsightOperator;
  if (!field || !op) return null;
  return { field, op, value: input.value };
}

function normalizeRuleScopes(rule: InsightRule): ScreenScope[] | undefined {
  const scopes = rule.scopes?.length
    ? rule.scopes
    : Array.isArray((rule as any).scope)
      ? ((rule as any).scope as ScreenScope[])
      : rule.scope
        ? [rule.scope]
        : undefined;
  return scopes?.length ? scopes : undefined;
}

export type InsightFeedbackLatest = {
  created_at: string;
  helpful: boolean;
  reason?: string | null;
};

export type InsightFeedbackIndex = {
  fingerprint: string;
  getLatest: (insightId: string) => InsightFeedbackLatest | null;
};

export type EnginePolicyOptions = {
  now?: Date;
  feedback?: {
    index: InsightFeedbackIndex;
    notRelevantMs: number; // 24h
    cooldownDays: number; // 7d
  };
};

function parseTimeMs(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  return Number.isFinite(t) ? t : null;
}

function isSuppressedByFeedback(insightId: string, opts?: EnginePolicyOptions): boolean {
  const fb = opts?.feedback;
  if (!fb) return false;

  const latest = fb.index.getLatest(insightId);
  if (!latest) return false;

  // Only suppress on helpful=false
  if (latest.helpful !== false) return false;

  const nowMs = (opts?.now ?? new Date()).getTime();
  const createdMs = parseTimeMs(latest.created_at);
  if (createdMs === null) return false;

  const reason = (latest.reason ?? '').toString();

  // reason = not_relevant_now => 24h
  if (reason === 'not_relevant_now') {
    return nowMs - createdMs < fb.notRelevantMs;
  }

  // any other helpful=false => 7 days
  const cooldownMs = fb.cooldownDays * 24 * 60 * 60 * 1000;
  return nowMs - createdMs < cooldownMs;
}

function fingerprintFromRows(rows: any[] | null | undefined): string {
  const newest = rows && rows.length ? String(rows[0]?.created_at ?? '') : '';
  return `rows;n=${rows?.length ?? 0};newest=${newest}`;
}

/**
 * Build index from latestById map (preferred).
 * expected shape: { [insight_id]: { created_at, helpful, reason } }
 */
export function buildFeedbackIndexFromLatestById(
  latestById: Record<string, any> | null | undefined,
): InsightFeedbackIndex | null {
  if (!latestById) return null;
  const entries = Object.entries(latestById);
  if (!entries.length) return null;

  const newest =
    entries
      .map(([, v]) => String(v?.created_at ?? ''))
      .sort()
      .slice(-1)[0] ?? '';

  const fingerprint = `latestById;n=${entries.length};newest=${newest}`;

  return {
    fingerprint,
    getLatest: (insightId: string): InsightFeedbackLatest | null => {
      const key = String(insightId ?? '').trim();
      if (!key) return null;
      const v = (latestById as any)[key];
      if (!v) return null;
      return {
        created_at: String(v.created_at ?? ''),
        helpful: !!v.helpful,
        reason: v.reason ?? null,
      };
    },
  };
}

/**
 * Build index from newest-first rows array (fallback).
 */
export function buildFeedbackIndexFromRows(rows: any[] | null | undefined): InsightFeedbackIndex | null {
  if (!rows?.length) return null;

  const latestById = new Map<string, { created_at: string; helpful: boolean; reason?: string | null }>();

  for (const r of rows ?? []) {
    const id = String(r?.insight_id ?? '').trim();
    if (!id) continue;
    if (!latestById.has(id)) {
      latestById.set(id, {
        created_at: String(r?.created_at ?? ''),
        helpful: r?.helpful === true,
        reason: r?.reason ?? null,
      });
    }
  }

  const fingerprint = fingerprintFromRows(rows);

  return {
    fingerprint,
    getLatest: (insightId: string): InsightFeedbackLatest | null => {
      const key = String(insightId ?? '').trim();
      if (!key) return null;
      const row = latestById.get(key);
      if (!row) return null;
      return { created_at: row.created_at, helpful: row.helpful, reason: row.reason ?? null };
    },
  };
}

export type InsightEngine = {
  evaluateAll: (context: InsightContext, opts?: EnginePolicyOptions) => InsightMatch[];
};

export function createInsightEngine(rules: InsightRule[]): InsightEngine {
  // Pre-normalize rules for stable iteration
  const normalizedRules = (rules ?? []).map((r) => {
    const conditionsInput = (r.conditions ?? (r as any).condition ?? []) as any[];
    const conditions = conditionsInput.map(normalizeCondition).filter(Boolean) as InsightCondition[];
    const scopes = normalizeRuleScopes(r);

    return {
      ...r,
      conditions,
      scopes,
      priority: typeof r.priority === 'number' ? r.priority : 0,
    };
  });

  function evaluateAll(context: InsightContext, opts?: EnginePolicyOptions): InsightMatch[] {
    let suppressedCount = 0;
    let evaluatedCount = 0;
    const matches: InsightMatch[] = [];

    for (const rule of normalizedRules) {
      evaluatedCount += 1;
      const ruleConditions = (rule.conditions ?? []) as InsightCondition[];

      const matchedConditions: InsightCondition[] = [];
      const explain: Record<string, any> = {};

      let ok = true;

      for (const cond of ruleConditions) {
        if (!cond) continue;

        const actual = getByPath(context, cond.field);

        // Special: tags.contains expects array
        if (cond.field === 'tags.contains') {
          const tags = Array.isArray(actual) ? actual : [];
          const has = tags.some((t) => String(t).trim() === String(cond.value).trim());
          explain[`${cond.field}`] = { actual: tags, expected: cond.value, op: cond.op, pass: has };
          if (!has) {
            ok = false;
            break;
          }
          matchedConditions.push(cond);
          continue;
        }

        const pass = compare(cond.op, actual, cond.value);
        explain[`${cond.field}`] = { actual, expected: cond.value, op: cond.op, pass };

        if (!pass) {
          ok = false;
          break;
        }

        matchedConditions.push(cond);
      }

      if (!ok) continue;

      const insightId = String(rule.id ?? rule.sourceTag ?? rule.message).trim();
      if (!insightId) continue;

      // ✅ suppression
      if (isSuppressedByFeedback(insightId, opts)) {
        suppressedCount += 1;
        continue;
      }

      matches.push({
        id: insightId,
        priority: rule.priority ?? 0,
        message: rule.message,
        action: rule.action,
        why: rule.why,
        icon: rule.icon,
        sourceTag: rule.sourceTag,
        scopes: rule.scopes,
        matchedConditions,
        explain,
      });
    }

    matches.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    const IS_DEV =
      typeof globalThis !== 'undefined' && (globalThis as any).__DEV__ === true;
    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.debug('[InsightEngine] evaluateAll', {
        evaluated: evaluatedCount,
        matched: matches.length,
        suppressed: suppressedCount,
      });
    }

    return matches;
  }

  return { evaluateAll };
}

/**
 * Helper function to evaluate and return the highest priority insight match
 * Returns the first match from evaluateAll, or null if none match
 */
export function evaluateInsight(
  context: InsightContext,
  rules: InsightRule[]
): InsightMatch | null {
  const engine = createInsightEngine(rules);
  const matches = engine.evaluateAll(context);
  return matches.length > 0 ? matches[0] : null;
}
