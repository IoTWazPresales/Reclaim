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
  | 'stress.flag';

export interface InsightCondition {
  field: InsightFieldPath;
  operator: InsightOperator;
  value: number | string;
}

export interface InsightRule {
  id: string;
  priority: number;
  condition: InsightCondition[];
  message: string;
  action: string;
  sourceTag: string;
  icon?: string;
  why?: string;
}

export interface InsightContextMood {
  last?: number;
  deltaVsBaseline?: number;
  trend3dPct?: number;
  tags?: string[];
}

export interface InsightContextSleepSegment {
  hours?: number;
  midpointMinutes?: number;
  deltaMin?: number;
}

export interface InsightContextSleep {
  lastNight?: InsightContextSleepSegment;
  avg7d?: InsightContextSleepSegment;
  midpoint?: {
    deltaMin?: number;
  };
}

export interface InsightContextSteps {
  lastDay?: number;
}

export interface InsightContextMeds {
  adherencePct7d?: number;
}

export interface InsightContextBehavior {
  daysSinceSocial?: number;
}

export interface InsightContextFlags {
  stress?: boolean;
}

export interface InsightContext {
  mood?: InsightContextMood;
  sleep?: InsightContextSleep;
  steps?: InsightContextSteps;
  meds?: InsightContextMeds;
  behavior?: InsightContextBehavior;
  flags?: InsightContextFlags;
  tags?: string[];
}

export interface InsightMatch {
  id: string;
  message: string;
  action: string;
  sourceTag: string;
  priority: number;
  matchedConditions: InsightCondition[];
  icon?: string;
  why?: string;
}

type FieldResolver = (context: InsightContext) => number | string | undefined | null;

const fieldResolvers: Record<InsightFieldPath, FieldResolver> = {
  'mood.last': (ctx) => ctx.mood?.last,
  'mood.deltaVsBaseline': (ctx) => ctx.mood?.deltaVsBaseline,
  'mood.trend3dPct': (ctx) => ctx.mood?.trend3dPct,
  'sleep.lastNight.hours': (ctx) => ctx.sleep?.lastNight?.hours,
  'sleep.avg7d.hours': (ctx) => ctx.sleep?.avg7d?.hours,
  'sleep.midpoint.deltaMin': (ctx) =>
    ctx.sleep?.midpoint?.deltaMin ?? ctx.sleep?.lastNight?.deltaMin ?? ctx.sleep?.avg7d?.deltaMin,
  'steps.lastDay': (ctx) => ctx.steps?.lastDay,
  'meds.adherencePct7d': (ctx) => ctx.meds?.adherencePct7d,
  'behavior.daysSinceSocial': (ctx) => ctx.behavior?.daysSinceSocial,
  'tags.contains': (ctx) => ctx.tags?.length ?? 0,
  'stress.flag': (ctx) => (ctx.flags?.stress ? 1 : 0),
};

const EPSILON = 0.0001;

function compareNumeric(actual: number | undefined | null, comparator: number, operator: InsightOperator) {
  if (actual === undefined || actual === null) {
    return false;
  }

  switch (operator) {
    case 'lt':
      return actual < comparator;
    case 'lte':
      return actual <= comparator;
    case 'gt':
      return actual > comparator;
    case 'gte':
      return actual >= comparator;
    case 'eq':
      return Math.abs(actual - comparator) < EPSILON;
    case 'deltaLt':
    case 'pctLt':
      return actual <= comparator;
    case 'deltaGt':
    case 'pctGt':
      return actual >= comparator;
    default:
      return false;
  }
}

function evaluateCondition(condition: InsightCondition, context: InsightContext): boolean {
  const resolver = fieldResolvers[condition.field];
  if (!resolver) {
    return false;
  }

  const actualValue = resolver(context);

  if (condition.field === 'tags.contains' && typeof condition.value === 'string') {
    if (!Array.isArray(context.tags)) {
      return false;
    }
    return context.tags.includes(condition.value);
  }

  if (condition.field === 'stress.flag') {
    return compareNumeric(typeof actualValue === 'number' ? actualValue : 0, Number(condition.value), condition.operator);
  }

  if (typeof actualValue === 'string') {
    return typeof condition.value === 'string' && actualValue === condition.value;
  }

  if (typeof condition.value !== 'number') {
    return false;
  }

  return compareNumeric(Number(actualValue), condition.value, condition.operator);
}

function selectBestMatch(matches: InsightRule[]): InsightRule | null {
  if (!matches.length) {
    return null;
  }

  const highestPriority = Math.max(...matches.map((rule) => rule.priority));
  const topPriorityRules = matches.filter((rule) => rule.priority === highestPriority);

  if (topPriorityRules.length === 1) {
    return topPriorityRules[0];
  }

  const sorted = [...topPriorityRules].sort((a, b) => {
    const specificityA = a.condition.length;
    const specificityB = b.condition.length;
    if (specificityA !== specificityB) {
      return specificityB - specificityA;
    }
    return a.id.localeCompare(b.id);
  });

  return sorted[0];
}

export function evaluateInsight(context: InsightContext, rules: InsightRule[]): InsightMatch | null {
  const matchedRules = rules.filter((rule) => rule.condition.every((cond) => evaluateCondition(cond, context)));
  const best = selectBestMatch(matchedRules);

  if (!best) {
    return null;
  }

  return {
    id: best.id,
    message: best.message,
    action: best.action,
    sourceTag: best.sourceTag,
    priority: best.priority,
    matchedConditions: best.condition,
    icon: best.icon,
    why: best.why,
  };
}

export class InsightEngine {
  private cacheKey?: string;
  private cachedResult: InsightMatch | null = null;
  private readonly rules: InsightRule[];

  constructor(rules: InsightRule[]) {
    this.rules = rules;
  }

  evaluate(context: InsightContext): InsightMatch | null {
    const key = stableStringify(context);
    if (this.cacheKey === key) {
      return this.cachedResult;
    }
    const result = evaluateInsight(context, this.rules);
    this.cacheKey = key;
    this.cachedResult = result;
    return result;
  }
}

export function createInsightEngine(rules: InsightRule[]) {
  return new InsightEngine(rules);
}

export type { InsightRule as InsightRuleDefinition };

