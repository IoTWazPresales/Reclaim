/** Crisis / support emphasis on insight cards (dashboard sustained-low).
 * Uses Reclaim teal chrome — never amber/gold outlines (clashes with brand).
 */
export const insightEmphasisSupport = {
  accentBarWidth: 3,
  washDark: 'rgba(83, 201, 202, 0.08)',
  washLight: 'rgba(83, 201, 202, 0.06)',
  /** Match reclaimInsightModuleSurface border — soft teal, not warning gold. */
  accentDark: 'rgba(83, 201, 202, 0.55)',
  accentLight: 'rgba(13, 148, 136, 0.45)',
} as const;

export function insightSupportWash(dark: boolean): string {
  return dark ? insightEmphasisSupport.washDark : insightEmphasisSupport.washLight;
}

export function insightSupportAccent(dark: boolean): string {
  return dark ? insightEmphasisSupport.accentDark : insightEmphasisSupport.accentLight;
}
