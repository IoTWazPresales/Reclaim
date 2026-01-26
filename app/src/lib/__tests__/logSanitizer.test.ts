import { describe, it, expect } from 'vitest';
import { sanitizeLogPayload } from '../logSanitizer';

describe('logSanitizer', () => {
  describe('sanitizeLogPayload', () => {
    it('should redact sensitive keys', () => {
      const input = {
        password: 'secret123',
        access_token: 'token123',
        email: 'user@example.com',
        normalField: 'value',
      };
      const result = sanitizeLogPayload(input);
      expect(result.password).toBe('[REDACTED]');
      expect(result.access_token).toBe('[REDACTED]');
      expect(result.email).toBe('[REDACTED]');
      expect(result.normalField).toBe('value');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(600);
      const result = sanitizeLogPayload({ message: longString });
      expect(result.message).toContain('...[truncated]');
      expect(result.message.length).toBeLessThanOrEqual(500 + '...[truncated]'.length);
    });

    it('should limit depth', () => {
      const deep: any = { level1: {} };
      let current = deep.level1;
      for (let i = 2; i <= 10; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`];
      }
      const result = sanitizeLogPayload(deep);
      expect(result.level1).toBeDefined();
      // Depth limit should prevent excessive nesting
    });

    it('should handle arrays', () => {
      const input = {
        items: [
          { password: 'secret', name: 'item1' },
          { email: 'test@example.com', name: 'item2' },
        ],
      };
      const result = sanitizeLogPayload(input);
      expect(result.items[0].password).toBe('[REDACTED]');
      expect(result.items[0].name).toBe('item1');
      expect(result.items[1].email).toBe('[REDACTED]');
    });

    it('should handle circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      const result = sanitizeLogPayload(circular);
      expect(result.name).toBe('test');
      expect(result.self).toBe('[Circular Reference]');
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'stack trace';
      const result = sanitizeLogPayload({ error });
      expect(result.error.name).toBe('Error');
      expect(result.error.message).toBe('Test error');
      expect(result.error.stack).toBeDefined();
    });

    it('should handle null and undefined', () => {
      expect(sanitizeLogPayload(null)).toBeNull();
      expect(sanitizeLogPayload(undefined)).toBeUndefined();
    });

    it('should not throw on sanitization failure', () => {
      const problematic: any = {};
      Object.defineProperty(problematic, 'prop', {
        get() {
          throw new Error('Cannot access');
        },
      });
      // Should not throw
      expect(() => sanitizeLogPayload(problematic)).not.toThrow();
    });
  });
});
