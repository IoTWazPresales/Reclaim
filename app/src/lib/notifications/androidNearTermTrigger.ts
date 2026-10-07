/**
 * This Android image does not deliver calendar date triggers.
 * A rest-end that is due within 30 minutes is scheduled as a one-shot
 * time interval. The planned trigger stays an absolute date, so reconcile
 * does not restart the countdown. Longer reminders keep the calendar trigger.
 */
export const ANDROID_NEAR_TERM_MAX_SECONDS = 30 * 60;

export function androidDateTrigger(
  date: Date | string | number,
  nowMs: number,
  channelId: string,
  typeTimeInterval: string,
  typeCalendar: string,
): { type: string; seconds?: number; repeats?: boolean; date?: Date | string | number; channelId: string } {
  const ms = new Date(date).getTime() - nowMs;
  const seconds = Math.round(ms / 1000);
  if (seconds >= 1 && seconds <= ANDROID_NEAR_TERM_MAX_SECONDS) {
    return { type: typeTimeInterval, seconds, repeats: false, channelId };
  }
  return { type: typeCalendar, date, channelId };
}
