// C:\Reclaim\app\src\lib\meditationRuntime.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadActiveSession,
  setActiveSession,
  clearActiveSession,
  startSession,
  completeSession,
  cancelSession,
  isSessionActive,
  type MeditationSessionRecord,
} from './meditationRuntime';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('meditationRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AsyncStorage.getItem as any).mockResolvedValue(null);
    (AsyncStorage.setItem as any).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as any).mockResolvedValue(undefined);
  });

  const createMockSession = (id: string, overrides?: Partial<MeditationSessionRecord>): MeditationSessionRecord => ({
    id,
    startTime: new Date().toISOString(),
    meditationType: 'body_scan',
    ...overrides,
  });

  describe('loadActiveSession', () => {
    it('should return null when no active session exists', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);
      const result = await loadActiveSession();
      expect(result).toBeNull();
    });

    it('should return session when active session exists', async () => {
      const session = createMockSession('test-1');
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(session));
      const result = await loadActiveSession();
      expect(result).toEqual(session);
    });

    it('should clear corrupted data and return null', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify({ invalid: 'data' }));
      const result = await loadActiveSession();
      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@reclaim/meditations/active');
    });
  });

  describe('setActiveSession', () => {
    it('should store session when provided', async () => {
      const session = createMockSession('test-1');
      await setActiveSession(session);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@reclaim/meditations/active',
        JSON.stringify(session)
      );
    });

    it('should remove session when null provided', async () => {
      await setActiveSession(null);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@reclaim/meditations/active');
    });
  });

  describe('clearActiveSession', () => {
    it('should remove active session', async () => {
      await clearActiveSession();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@reclaim/meditations/active');
    });
  });

  describe('startSession', () => {
    it('should start new session when no active exists', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);
      const request = createMockSession('new-1');
      
      const result = await startSession(request);
      
      expect(result.actionTaken).toBe('started');
      expect(result.session).toEqual(request);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@reclaim/meditations/active',
        JSON.stringify(request)
      );
    });

    it('should resume existing session when active exists', async () => {
      const existing = createMockSession('existing-1');
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(existing));
      const request = createMockSession('new-1');
      
      const result = await startSession(request);
      
      expect(result.actionTaken).toBe('resumed');
      expect(result.session).toEqual(existing);
      expect(result.session.id).toBe('existing-1');
      // Should NOT set new session
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('completeSession', () => {
    it('should clear active session when matching sessionId', async () => {
      const active = createMockSession('complete-1');
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(active));
      
      const result = await completeSession('complete-1');
      
      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@reclaim/meditations/active');
    });

    it('should be idempotent: return false when called twice', async () => {
      const active = createMockSession('complete-1');
      (AsyncStorage.getItem as any)
        .mockResolvedValueOnce(JSON.stringify(active))
        .mockResolvedValueOnce(null); // Second call: already cleared
      
      const result1 = await completeSession('complete-1');
      const result2 = await completeSession('complete-1');
      
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should return false when different session is active', async () => {
      const active = createMockSession('other-1');
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(active));
      
      const result = await completeSession('complete-1');
      
      expect(result).toBe(false);
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should return false when no active session', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);
      
      const result = await completeSession('complete-1');
      
      expect(result).toBe(false);
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('cancelSession', () => {
    it('should clear active session when matching sessionId', async () => {
      const active = createMockSession('cancel-1');
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(active));
      
      const result = await cancelSession('cancel-1');
      
      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@reclaim/meditations/active');
    });

    it('should be idempotent: return false when called twice', async () => {
      const active = createMockSession('cancel-1');
      (AsyncStorage.getItem as any)
        .mockResolvedValueOnce(JSON.stringify(active))
        .mockResolvedValueOnce(null);
      
      const result1 = await cancelSession('cancel-1');
      const result2 = await cancelSession('cancel-1');
      
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should return false when different session is active', async () => {
      const active = createMockSession('other-1');
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(active));
      
      const result = await cancelSession('cancel-1');
      
      expect(result).toBe(false);
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('isSessionActive', () => {
    it('should return true when session is active', async () => {
      const active = createMockSession('check-1');
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(active));
      
      const result = await isSessionActive('check-1');
      
      expect(result).toBe(true);
    });

    it('should return false when different session is active', async () => {
      const active = createMockSession('other-1');
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(active));
      
      const result = await isSessionActive('check-1');
      
      expect(result).toBe(false);
    });

    it('should return false when no active session', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);
      
      const result = await isSessionActive('check-1');
      
      expect(result).toBe(false);
    });
  });
});
