// C:\Reclaim\app\src\lib\insights\pickInsightForScreen.ts

import type { InsightMatch } from '@/lib/insights/InsightEngine';

export type InsightScope = 'dashboard' | 'sleep' | 'mood' | 'meds' | 'global';

type PickOptions = {
  // Dashboard gets first shot at dashboard/global-ish tags
  dashboardFirst?: boolean;

  // In priority order
  preferredScopes?: InsightScope[];

  // If nothing matches preferred, allow picking global-ish fallback
  allowGlobalFallback?: boolean;

  // Optional: allow filtering out “cooldown” if a screen wants to hide it
  allowCooldown?: boolean;
};

function normalizeTag(tag?: string | null): string {
  return String(tag ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Source-tag → scope classifier (NOW)
// Later, you can add real rule.scope and switch to that.
function inferScopesFromSourceTag(sourceTag?: string | null): InsightScope[] {
  const t = normalizeTag(sourceTag);

  if (!t) return ['global'];

  // explicit bucket tags
  if (t === 'cooldown') return ['global'];

  const scopes: InsightScope[] = [];

  // dashboard/global hints
  if (t.includes('dashboard') || t.includes('today') || t.includes('global')) scopes.push('dashboard');

  // sleep
  if (t.includes('sleep') || t.includes('circadian') || t.includes('bedtime') || t.includes('winddown'))
    scopes.push('sleep');

  // meds
  if (t.includes('med') || t.includes('meds') || t.includes('medication') || t.includes('pill') || t.includes('adherence'))
    scopes.push('meds');

  // mood
  if (t.includes('mood') || t.includes('emotion') || t.includes('anxiety') || t.includes('stress'))
    scopes.push('mood');

  if (scopes.length === 0) scopes.push('global');

  // de-dupe while preserving order
  return Array.from(new Set(scopes));
}

function isCooldown(insight: InsightMatch) {
  const t = normalizeTag(insight.sourceTag);
  return t === 'cooldown' || insight.id === 'cooldown-not-relevant';
}

function isGlobalish(insight: InsightMatch) {
  return inferScopesFromSourceTag(insight.sourceTag).includes('global');
}

export function pickInsightForScreen(
  candidates: InsightMatch[],
  opts: PickOptions,
): InsightMatch | null {
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (!list.length) return null;

  const allowCooldown = opts.allowCooldown !== false;

  const filtered = allowCooldown ? list : list.filter((i) => !isCooldown(i));
  if (!filtered.length) return null;

  const preferred = opts.preferredScopes?.length
    ? opts.preferredScopes
    : (['sleep', 'meds', 'mood', 'dashboard', 'global'] as InsightScope[]);

  // Dashboard-first means: try "dashboard/global" before the rest
  const order = opts.dashboardFirst
    ? (['dashboard', 'global', ...preferred] as InsightScope[])
    : preferred;

  const orderUniq = Array.from(new Set(order));

  // First pass: strict scope match
  for (const desired of orderUniq) {
    const hit = filtered.find((insight) => inferScopesFromSourceTag(insight.sourceTag).includes(desired));
    if (hit) return hit;
  }

  // Second pass: if allowed, prefer "global" (not just the first candidate),
  // then fall back to first only if there is literally nothing global-ish.
  if (opts.allowGlobalFallback) {
    const globalHit = filtered.find((i) => isGlobalish(i));
    return globalHit ?? filtered[0] ?? null;
  }

  return null;
}
