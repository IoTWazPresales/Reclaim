import type { InsightMatch } from '@/lib/insights/InsightEngine';

/** One-line guidance when confidence is low or data is thin. */
export function confidenceNextStepForInsight(insight: InsightMatch): string | null {
  const n = insight.matchedConditions?.length ?? 0;
  if (n > 2) return null;
  if (insight.action?.trim()) return null;

  const tag = (insight.sourceTag ?? insight.id ?? '').toLowerCase();
  if (tag.includes('sleep')) {
    return 'This read sharpens automatically over the next few nights.';
  }
  if (tag.includes('med')) {
    return 'Log your next dose when you take it — adherence patterns need a few logged doses.';
  }
  if (tag.includes('mood')) {
    return 'Check in with mood daily for a week — patterns become clearer with more entries.';
  }
  if (tag.includes('train') || tag.includes('exercise')) {
    return 'Complete a session or two this week — training insights need recent activity.';
  }
  return 'Keep logging for a few more days — this signal firms up as more data arrives.';
}

export function confidenceNextStepForHero(
  label: 'Low' | 'Medium' | 'High',
  domain: 'mood' | 'sleep' | 'meds',
): string | null {
  if (label !== 'Low') return null;
  switch (domain) {
    case 'mood':
      return 'Log mood a few more days to strengthen this read.';
    case 'sleep':
      return 'Confidence builds automatically as more nights come in.';
    case 'meds':
      return 'Log doses when you take them — adherence needs a short track record.';
    default:
      return null;
  }
}
