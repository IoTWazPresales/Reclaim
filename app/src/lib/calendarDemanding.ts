/**
 * Shared heuristic for "workload / transition" calendar events (non-clinical).
 * Used by wellness nudges and the insight engine calendar slice — keep in sync.
 */
export const DEMANDING_CALENDAR_TITLE_RE =
  /interview|presentation|performance\s*review|1:1|one[\s-]on[\s-]one|exam|deadline|court|surgery|scan|dentist|doctor|therapy|counsel|appraisal|standup|all[\s-]hands|pitch|demo\b/i;

export function isDemandingCalendarTitle(title: string): boolean {
  return DEMANDING_CALENDAR_TITLE_RE.test((title || '').trim());
}
