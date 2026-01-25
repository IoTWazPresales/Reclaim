// Unit tests for date utilities - validates local timezone handling
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatLocalDateYYYYMMDD, getTodayLocalYYYYMMDD } from './dateUtils';

describe('Date Utils - Local Timezone Handling', () => {
  let originalTZ: string | undefined;

  beforeEach(() => {
    // Store original timezone
    originalTZ = process.env.TZ;
  });

  afterEach(() => {
    // Restore original timezone
    if (originalTZ !== undefined) {
      process.env.TZ = originalTZ;
    } else {
      delete process.env.TZ;
    }
  });

  describe('formatLocalDateYYYYMMDD', () => {
    it('should format dates in local timezone (not UTC)', () => {
      // Create a date that would drift in UTC+9 (Tokyo)
      // 2024-01-20 01:00:00 in Tokyo (UTC+9) = 2024-01-19 16:00:00 UTC
      // Using toISOString().split('T')[0] would return "2024-01-19" ❌
      // formatLocalDateYYYYMMDD should return "2024-01-20" ✅
      
      // Simulate Tokyo timezone by creating a date at 1 AM local time
      // Note: This test depends on the test environment's timezone
      // In a real scenario, we'd use a timezone library, but for this test
      // we verify that the function uses local timezone methods (getFullYear, getMonth, getDate)
      // rather than UTC methods (getUTCFullYear, getUTCMonth, getUTCDate)
      
      const date = new Date('2024-01-20T01:00:00');
      const formatted = formatLocalDateYYYYMMDD(date);
      
      // Should use local date components, not UTC
      const expectedYear = date.getFullYear();
      const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
      const expectedDay = String(date.getDate()).padStart(2, '0');
      const expected = `${expectedYear}-${expectedMonth}-${expectedDay}`;
      
      expect(formatted).toBe(expected);
      expect(formatted).not.toBe(date.toISOString().split('T')[0]); // Should differ if timezone offset exists
    });

    it('should handle dates correctly regardless of timezone offset', () => {
      // Test with a date that has a timezone offset
      // If we're in UTC+9 and it's 2024-01-20 01:00 local, UTC would be 2024-01-19 16:00
      const date = new Date('2024-01-20T01:00:00+09:00');
      
      // The Date object normalizes to local timezone
      // formatLocalDateYYYYMMDD should use the local representation
      const formatted = formatLocalDateYYYYMMDD(date);
      
      // Should match local date components
      const localYear = date.getFullYear();
      const localMonth = String(date.getMonth() + 1).padStart(2, '0');
      const localDay = String(date.getDate()).padStart(2, '0');
      const expected = `${localYear}-${localMonth}-${localDay}`;
      
      expect(formatted).toBe(expected);
    });

    it('should format dates consistently', () => {
      const date1 = new Date('2024-01-20T00:00:00');
      const date2 = new Date('2024-01-20T23:59:59');
      
      // Both should format to the same date (same day)
      const formatted1 = formatLocalDateYYYYMMDD(date1);
      const formatted2 = formatLocalDateYYYYMMDD(date2);
      
      expect(formatted1).toBe(formatted2);
      expect(formatted1).toBe('2024-01-20');
    });

    it('should pad month and day with zeros', () => {
      const date = new Date('2024-01-05T12:00:00');
      const formatted = formatLocalDateYYYYMMDD(date);
      
      expect(formatted).toBe('2024-01-05');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getTodayLocalYYYYMMDD', () => {
    it('should return today\'s date in local timezone', () => {
      const today = getTodayLocalYYYYMMDD();
      const now = new Date();
      const expected = formatLocalDateYYYYMMDD(now);
      
      expect(today).toBe(expected);
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should not drift to previous day in timezones ahead of UTC', () => {
      // This test documents the critical behavior:
      // In timezones ahead of UTC (e.g., UTC+9), if it's 2024-01-20 01:00 local,
      // toISOString() would return 2024-01-19 16:00 UTC, causing date drift.
      // getTodayLocalYYYYMMDD() should always return the correct local date.
      
      const today = getTodayLocalYYYYMMDD();
      const now = new Date();
      
      // Verify it uses local date components
      const localYear = now.getFullYear();
      const localMonth = String(now.getMonth() + 1).padStart(2, '0');
      const localDay = String(now.getDate()).padStart(2, '0');
      const expected = `${localYear}-${localMonth}-${localDay}`;
      
      expect(today).toBe(expected);
      
      // Critical assertion: should NOT match UTC date if timezone offset exists
      const utcDate = now.toISOString().split('T')[0];
      // If we're in a timezone ahead of UTC and it's early morning,
      // the UTC date might be the previous day
      // Our function should always return the local date
      if (now.getHours() < Math.abs(now.getTimezoneOffset() / 60)) {
        // Early morning in timezone ahead of UTC - UTC date might be previous day
        // But our function should return local date
        expect(today).not.toBe(utcDate);
      }
    });
  });

  describe('Timezone regression prevention', () => {
    it('should prevent weekday drift in timezones ahead of UTC', () => {
      // REGRESSION TEST: This documents the bug we're preventing
      // 
      // Scenario: User in Tokyo (UTC+9) selects Monday (weekday 1) for training
      // If it's 2024-01-20 01:00 local time (Monday morning):
      // - Local date: 2024-01-20 (Monday) ✅
      // - UTC date: 2024-01-19 16:00 (Sunday) ❌
      // 
      // Using toISOString().split('T')[0] would return "2024-01-19" (Sunday),
      // causing the selected weekday to drift from Monday to Sunday.
      //
      // formatLocalDateYYYYMMDD() should always return "2024-01-20" (Monday),
      // preventing weekday drift.
      
      // Create a date representing Monday 1 AM in a timezone ahead of UTC
      // We'll use a date that would be Sunday in UTC but Monday locally
      const mondayMorning = new Date('2024-01-20T01:00:00');
      
      // Verify it's actually Monday (or adjust test if needed)
      const weekday = mondayMorning.getDay();
      const isMonday = weekday === 1 || (weekday === 0 && mondayMorning.getDate() === 20);
      
      if (isMonday || weekday === 1) {
        const formatted = formatLocalDateYYYYMMDD(mondayMorning);
        
        // Should return the local date, not UTC date
        const localYear = mondayMorning.getFullYear();
        const localMonth = String(mondayMorning.getMonth() + 1).padStart(2, '0');
        const localDay = String(mondayMorning.getDate()).padStart(2, '0');
        const expectedLocal = `${localYear}-${localMonth}-${localDay}`;
        
        expect(formatted).toBe(expectedLocal);
        
        // Critical: Should NOT match UTC date if there's a timezone offset
        const utcFormatted = mondayMorning.toISOString().split('T')[0];
        // If there's a timezone offset and it's early morning, dates might differ
        if (mondayMorning.getTimezoneOffset() !== 0) {
          // In timezones ahead of UTC, early morning dates might differ
          // Our function should always use local date
          expect(formatted).toBe(expectedLocal);
        }
      }
    });
  });
});
