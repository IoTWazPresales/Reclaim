// C:\Reclaim\app\src\lib\insights\__tests__/seenStore.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  markInsightSeen,
  wasInsightSeenRecently,
  pruneOldSeenEntriesSync,
  filterUnseenInsights,
} from '../seenStore';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe('seenStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AsyncStorage.getItem as any).mockResolvedValue(null);
    (AsyncStorage.setItem as any).mockResolvedValue(undefined);
  });

  describe('markInsightSeen', () => {
    it('should write timestamp to storage', async () => {
      await markInsightSeen({
        userId: 'user1',
        screen: 'dashboard',
        insightId: 'insight-1',
        ts: 1000,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@reclaim/insights:seen:v1:user1',
        expect.stringContaining('dashboard:insight-1'),
      );
    });

    it('should handle anon user', async () => {
      await markInsightSeen({
        userId: null,
        screen: 'mood',
        insightId: 'insight-2',
        ts: 2000,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@reclaim/insights:seen:v1:anon',
        expect.stringContaining('mood:insight-2'),
      );
    });

    it('should prune old entries when saving', async () => {
      const oldTs = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const newTs = Date.now();

      (AsyncStorage.getItem as any).mockResolvedValue(
        JSON.stringify({
          'dashboard:old': oldTs,
          'dashboard:new': newTs - 1000,
        }),
      );

      await markInsightSeen({
        userId: 'user1',
        screen: 'dashboard',
        insightId: 'insight-3',
        ts: newTs,
      });

      const setCall = (AsyncStorage.setItem as any).mock.calls[0];
      const saved = JSON.parse(setCall[1]);
      expect(saved['dashboard:old']).toBeUndefined();
      expect(saved['dashboard:new']).toBeDefined();
      expect(saved['dashboard:insight-3']).toBe(newTs);
    });
  });

  describe('wasInsightSeenRecently', () => {
    it('should return false if not seen', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);

      const result = await wasInsightSeenRecently({
        userId: 'user1',
        screen: 'dashboard',
        insightId: 'insight-1',
        nowTs: 1000,
      });

      expect(result).toBe(false);
    });

    it('should return true if seen within TTL', async () => {
      const nowTs = Date.now();
      const seenTs = nowTs - 12 * 60 * 60 * 1000; // 12 hours ago

      (AsyncStorage.getItem as any).mockResolvedValue(
        JSON.stringify({
          'dashboard:insight-1': seenTs,
        }),
      );

      const result = await wasInsightSeenRecently({
        userId: 'user1',
        screen: 'dashboard',
        insightId: 'insight-1',
        nowTs,
      });

      expect(result).toBe(true);
    });

    it('should return false if seen outside TTL', async () => {
      const nowTs = Date.now();
      const seenTs = nowTs - 25 * 60 * 60 * 1000; // 25 hours ago

      (AsyncStorage.getItem as any).mockResolvedValue(
        JSON.stringify({
          'dashboard:insight-1': seenTs,
        }),
      );

      const result = await wasInsightSeenRecently({
        userId: 'user1',
        screen: 'dashboard',
        insightId: 'insight-1',
        nowTs,
      });

      expect(result).toBe(false);
    });
  });

  describe('pruneOldSeenEntriesSync', () => {
    it('should remove entries older than TTL', () => {
      const nowTs = Date.now();
      const oldTs = nowTs - 25 * 60 * 60 * 1000; // 25 hours ago
      const recentTs = nowTs - 12 * 60 * 60 * 1000; // 12 hours ago

      const seen: Record<string, number> = {
        'dashboard:old': oldTs,
        'dashboard:recent': recentTs,
        'mood:old': oldTs,
        'mood:recent': recentTs,
      };

      const pruned = pruneOldSeenEntriesSync(seen, nowTs, 24 * 60 * 60 * 1000);

      expect(pruned['dashboard:old']).toBeUndefined();
      expect(pruned['dashboard:recent']).toBe(recentTs);
      expect(pruned['mood:old']).toBeUndefined();
      expect(pruned['mood:recent']).toBe(recentTs);
    });
  });

  describe('filterUnseenInsights', () => {
    it('should filter out seen insights', async () => {
      const nowTs = Date.now();
      const seenTs = nowTs - 12 * 60 * 60 * 1000; // 12 hours ago

      (AsyncStorage.getItem as any).mockResolvedValue(
        JSON.stringify({
          'dashboard:insight-1': seenTs,
        }),
      );

      const insights = [
        { id: 'insight-1', message: 'A' },
        { id: 'insight-2', message: 'B' },
        { id: 'insight-3', message: 'C' },
      ];

      const filtered = await filterUnseenInsights({
        insights,
        screen: 'dashboard',
        userId: 'user1',
        nowTs,
      });

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('insight-2');
      expect(filtered[1].id).toBe('insight-3');
    });

    it('should return all insights if none are seen', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);

      const insights = [
        { id: 'insight-1', message: 'A' },
        { id: 'insight-2', message: 'B' },
      ];

      const filtered = await filterUnseenInsights({
        insights,
        screen: 'dashboard',
        userId: 'user1',
        nowTs: Date.now(),
      });

      expect(filtered).toHaveLength(2);
    });
  });
});
