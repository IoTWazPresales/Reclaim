/** Crisis / support emphasis on insight cards (dashboard sustained-low). */
export const insightEmphasisSupport = {
  accentBarWidth: 3,
  washDark: 'rgba(251, 191, 36, 0.08)',
  washLight: 'rgba(251, 191, 36, 0.06)',
  accentDark: 'rgba(251, 191, 36, 0.85)',
  accentLight: 'rgba(217, 119, 6, 0.75)',
} as const;

export function insightSupportWash(dark: boolean): string {
  return dark ? insightEmphasisSupport.washDark : insightEmphasisSupport.washLight;
}

export function insightSupportAccent(dark: boolean): string {
  return dark ? insightEmphasisSupport.accentDark : insightEmphasisSupport.accentLight;
}
