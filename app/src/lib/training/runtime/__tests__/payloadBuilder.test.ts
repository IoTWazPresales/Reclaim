/**
 * Tests for payload builder utilities
 * 
 * Verifies that payloads use actual DB itemIds (TEXT), not synthetic runtime itemIds.
 */

import { describe, it, expect } from 'vitest';
import { buildSetLogPayload, buildSetLogQueuePayload } from '../payloadBuilder';

describe('Payload Builder', () => {
  describe('buildSetLogPayload', () => {
    it('should use actual DB itemId, not synthetic runtime itemId', () => {
      const dbItemId = 'actual_db_item_id_123'; // Actual DB TEXT ID
      const dbSessionId = 'actual_db_session_id_456'; // Actual DB TEXT ID
      const syntheticItemId = 'session_456_item_0'; // Synthetic runtime ID (should NOT be used)
      
      const payload = buildSetLogPayload(
        dbItemId,
        dbSessionId,
        'exercise_123',
        1,
        50.0,
        10,
        7,
        new Date().toISOString(),
      );
      
      expect(payload.sessionItemId).toBe(dbItemId); // Should be actual DB ID
      expect(payload.sessionItemId).not.toBe(syntheticItemId); // Should NOT be synthetic ID
      expect(payload.sessionId).toBe(dbSessionId); // Should be actual DB session ID
      expect(payload.exerciseId).toBe('exercise_123');
      expect(payload.setIndex).toBe(1);
      expect(payload.weight).toBe(50.0);
      expect(payload.reps).toBe(10);
      expect(payload.rpe).toBe(7);
      expect(payload.id).toMatch(new RegExp(`^${dbItemId}_set_1_\\d+$`)); // ID should be based on DB itemId
    });
    
    it('should handle null RPE correctly', () => {
      const payload = buildSetLogPayload(
        'item_123',
        'session_456',
        'exercise_789',
        2,
        60.0,
        8,
        null,
        new Date().toISOString(),
      );
      
      expect(payload.rpe).toBe(null);
    });
    
    it('should handle undefined RPE correctly', () => {
      const payload = buildSetLogPayload(
        'item_123',
        'session_456',
        'exercise_789',
        2,
        60.0,
        8,
        undefined,
        new Date().toISOString(),
      );
      
      expect(payload.rpe).toBe(null);
    });
    
    it('should generate set log ID from DB itemId with timestamp', () => {
      const dbItemId = 'item_abc';
      const payload1 = buildSetLogPayload(dbItemId, 'session_1', 'ex_1', 1, 50, 10, 7, new Date().toISOString());
      
      // ID should be based on DB itemId and include timestamp
      expect(payload1.id).toMatch(/^item_abc_set_1_\d+$/);
      expect(payload1.id).toContain(dbItemId);
      expect(payload1.id).toContain('set_1');
    });
  });
  
  describe('buildSetLogQueuePayload', () => {
    it('should use actual DB itemId for offline queue', () => {
      const dbItemId = 'actual_db_item_id_789';
      const syntheticItemId = 'session_123_item_1'; // Should NOT be used
      
      const payload = buildSetLogQueuePayload(dbItemId, 'exercise_456', 3, 70.0, 12, 8);
      
      expect(payload.type).toBe('insertSetLog');
      expect(payload.sessionItemId).toBe(dbItemId); // Should be actual DB ID
      expect(payload.sessionItemId).not.toBe(syntheticItemId); // Should NOT be synthetic ID
      expect(payload.payload.setIndex).toBe(3);
      expect(payload.payload.weight).toBe(70.0);
      expect(payload.payload.reps).toBe(12);
      expect(payload.payload.rpe).toBe(8);
      expect(payload.id).toMatch(new RegExp(`^${dbItemId}_set_3_\\d+$`)); // ID based on DB itemId
    });
    
    it('should have same structure as online insert payload', () => {
      const dbItemId = 'item_xyz';
      
      const onlinePayload = buildSetLogPayload(dbItemId, 'session_1', 'ex_1', 1, 50, 10, 7, new Date().toISOString());
      const offlinePayload = buildSetLogQueuePayload(dbItemId, 'ex_1', 1, 50, 10, 7);
      
      // Both should use same DB itemId
      expect(onlinePayload.sessionItemId).toBe(offlinePayload.sessionItemId);
      expect(onlinePayload.setIndex).toBe(offlinePayload.payload.setIndex);
      expect(onlinePayload.weight).toBe(offlinePayload.payload.weight);
      expect(onlinePayload.reps).toBe(offlinePayload.payload.reps);
      expect(onlinePayload.rpe).toBe(offlinePayload.payload.rpe);
    });
    
    it('should handle null RPE in queue payload', () => {
      const payload = buildSetLogQueuePayload('item_123', 'ex_1', 1, 50, 10, null);
      // RPE should be omitted (undefined) when null, since it's optional
      expect(payload.payload.rpe).toBeUndefined();
    });
  });
});
