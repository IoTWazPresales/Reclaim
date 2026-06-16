/**
 * Pure merges for insight context inputs — device-local mirror + Supabase ledger.
 * Policy: same-id sleep rows → remote wins; med dose rows dedupe by (med_id, scheduled_for)
 * with remote winning the slot when present, local fills offline-only slots.
 */

/** Remote wins on duplicate `id` (cloud ledger); local-only ids retained for offline sessions. */
export function mergeSleepSessionsForInsights<T extends { id: string; start_time: string }>(
  local: T[],
  remote: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const s of local) {
    if (s?.id) byId.set(s.id, s);
  }
  for (const s of remote) {
    if (s?.id) byId.set(s.id, s);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );
}

function medDoseSlotKey(l: { med_id: string; scheduled_for?: string | null }): string {
  return `${l.med_id}|${l.scheduled_for ?? ''}`;
}

/**
 * Remote fills authoritative slots first; local adds slots missing from remote (e.g. offline).
 * Avoids double-counting the same scheduled dose when client temp ids differ from server ids.
 */
export function mergeMedDoseLogsForInsights<
  T extends { med_id: string; scheduled_for?: string | null },
>(local: T[], remote: T[]): T[] {
  const bySlot = new Map<string, T>();
  for (const l of remote) {
    bySlot.set(medDoseSlotKey(l), l);
  }
  for (const l of local) {
    const k = medDoseSlotKey(l);
    if (!bySlot.has(k)) bySlot.set(k, l);
  }
  return [...bySlot.values()].sort((a, b) =>
    String(b.scheduled_for ?? '').localeCompare(String(a.scheduled_for ?? '')),
  );
}
