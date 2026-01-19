// C:\Reclaim\app\src\lib\insights\scope.ts
import type { InsightRule, ScreenScope } from './InsightEngine';

export function normalizeScope(input: unknown): ScreenScope {
  const raw = String(input ?? '').trim().toLowerCase();
  const s = raw.replace(/^\//, '').replace(/\s+/g, '_');

  if (s.includes('dashboard') || s === 'home') return 'dashboard';
  if (s.includes('sleep')) return 'sleep';
  if (s.includes('mood')) return 'mood';
  if (s.includes('med')) return 'meds';

  return 'global';
}

/**
 * Backwards compatibility:
 * If a rule does not specify scope, infer it from sourceTag/id.
 */
export function inferScopesFromRule(rule: Pick<InsightRule, 'scope' | 'sourceTag' | 'id'>): ScreenScope[] {
  if (Array.isArray(rule.scope) && rule.scope.length) return rule.scope;

  const key = String(rule.sourceTag ?? rule.id ?? '').toLowerCase();

  if (key.includes('dashboard')) return ['dashboard'];
  if (key.includes('sleep')) return ['sleep'];
  if (key.includes('mood')) return ['mood'];
  if (key.includes('med')) return ['meds'];

  return ['global'];
}
