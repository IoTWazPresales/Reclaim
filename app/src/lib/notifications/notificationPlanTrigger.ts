/**
 * Trigger-shape helpers for reconcile (no Expo imports — safe for unit tests).
 *
 * Immediate one-shots use `trigger: null`; they are delivered once and typically
 * do not appear in getAllScheduledNotificationsAsync afterward.
 */
export function plannedNotificationExpectsNativeScheduledEntry(
  planned: { trigger: unknown } & Record<string, unknown>,
): boolean {
  const t = planned.trigger as any;
  return !(t === null || t === undefined);
}

/**
 * Reconcile fast-path (P0-2): when the plan fingerprint is unchanged, skip work
 * only if every entry that should still exist in the OS scheduled list has a
 * matching `logicalKey` in `getAllScheduledNotificationsAsync`. Immediate
 * entries are excluded — they vanish from the native queue after delivery.
 */
export function mergedPlanSatisfiesNativeScheduledPresence(
  merged: ReadonlyArray<{ logicalKey: string | number | symbol; trigger: unknown } & Record<string, unknown>>,
  scheduledLogicalKeys: ReadonlySet<string>,
): boolean {
  return merged.every((n) => {
    if (!plannedNotificationExpectsNativeScheduledEntry(n)) return true;
    return scheduledLogicalKeys.has(String(n.logicalKey));
  });
}
