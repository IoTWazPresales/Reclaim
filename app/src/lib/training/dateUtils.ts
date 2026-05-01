/**
 * Date utilities for training module
 * 
 * CRITICAL: All date formatting uses LOCAL timezone, not UTC.
 * 
 * Rationale:
 * - Training schedules are user-local concepts (e.g., "Monday in my timezone")
 * - Using UTC can cause date drift: if it's 2024-01-20 01:00 in Tokyo (UTC+9),
 *   toISOString() returns 2024-01-19 16:00 UTC, which splits to "2024-01-19"
 * - This causes selected weekdays to drift to the previous day (e.g., Monday -> Sunday)
 * - Local date formatting ensures dates match user expectations regardless of timezone
 * 
 * Example:
 *   In Tokyo (UTC+9) at 2024-01-20 01:00 local:
 *   - toISOString().split('T')[0] = "2024-01-19" ❌ (wrong day)
 *   - formatLocalDateYYYYMMDD() = "2024-01-20" ✅ (correct day)
 */

/**
 * Format a Date object as YYYY-MM-DD in LOCAL timezone
 * 
 * This is critical for training scheduling to prevent weekday drift in timezones ahead of UTC.
 * 
 * @param date - Date object (will be interpreted in local timezone)
 * @returns Date string in YYYY-MM-DD format (local timezone)
 * 
 * @example
 *   const date = new Date('2024-01-20T01:00:00+09:00'); // Tokyo time
 *   formatLocalDateYYYYMMDD(date); // "2024-01-20" (not "2024-01-19")
 */
export function formatLocalDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in LOCAL timezone as YYYY-MM-DD
 * 
 * @returns Today's date string in YYYY-MM-DD format (local timezone)
 */
export function getTodayLocalYYYYMMDD(): string {
  return formatLocalDateYYYYMMDD(new Date());
}
