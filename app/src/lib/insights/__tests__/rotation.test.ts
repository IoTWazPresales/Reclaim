// C:\Reclaim\app\src\lib\insights\__tests__/rotation.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { filterUnseenInsights } from '../seenStore';
import { pickInsightForScreen } from '../pickInsightForScreen';
import type { InsightMatch } from '../InsightEngine';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe('insight rotation behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AsyncStorage.getItem as any).mockResolvedValue(null);
    (AsyncStorage.setItem as any).mockResolvedValue(undefined);
  });

  it('should choose second insight when first is seen recently', async () => {
    const nowTs = Date.now();
    const seenTs = nowTs - 12 * 60 * 60 * 1000; // 12 hours ago

    const rankedInsights: InsightMatch[] = [
      {
        id: 'insight-a',
        priority: 10,
        message: 'A',
        matchedConditions: [],
        scopes: ['dashboard'],
      },
      {
        id: 'insight-b',
        priority: 9,
        message: 'B',
        matchedConditions: [],
        scopes: ['dashboard'],
      },
      {
        id: 'insight-c',
        priority: 8,
        message: 'C',
        matchedConditions: [],
        scopes: ['dashboard'],
      },
    ];

    // Mark first as seen
    (AsyncStorage.getItem as any).mockResolvedValue(
      JSON.stringify({
        'dashboard:insight-a': seenTs,
      }),
    );

    // Filter unseen
    const unseen = await filterUnseenInsights({
      insights: rankedInsights,
      screen: 'dashboard',
      userId: 'user1',
      nowTs,
    });

    // Select from unseen
    const selected = pickInsightForScreen(unseen, {
      preferredScopes: ['dashboard'],
      allowGlobalFallback: true,
    });

    expect(selected.id).toBe('insight-b');
  });

  it('should fall back to first insight if all are seen', async () => {
    const nowTs = Date.now();
    const seenTs = nowTs - 12 * 60 * 60 * 1000; // 12 hours ago

    const rankedInsights: InsightMatch[] = [
      {
        id: 'insight-a',
        priority: 10,
        message: 'A',
        matchedConditions: [],
        scopes: ['dashboard'],
      },
      {
        id: 'insight-b',
        priority: 9,
        message: 'B',
        matchedConditions: [],
        scopes: ['dashboard'],
      },
    ];

    // Mark all as seen
    (AsyncStorage.getItem as any).mockResolvedValue(
      JSON.stringify({
        'dashboard:insight-a': seenTs,
        'dashboard:insight-b': seenTs,
      }),
    );

    // Filter unseen (should return empty, so we fall back to original)
    const unseen = await filterUnseenInsights({
      insights: rankedInsights,
      screen: 'dashboard',
      userId: 'user1',
      nowTs,
    });

    // If all seen, filterUnseenInsights returns empty, so use original list
    const candidates = unseen.length > 0 ? unseen : rankedInsights;
    const selected = pickInsightForScreen(candidates, {
      preferredScopes: ['dashboard'],
      allowGlobalFallback: true,
    });

    expect(selected.id).toBe('insight-a');
  });
});
