/**
 * Sanitize/redact sensitive data from logs and telemetry payloads
 * Redacts PII and sensitive fields, truncates long strings, limits depth
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /pass$/i,
  /token/i,
  /access_token/i,
  /refresh_token/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /supabase/i,
  /key$/i,
  /secret/i,
  /email/i,
  /phone/i,
];

const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 4;

/**
 * Check if a key matches sensitive patterns
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Redact a value (returns '[REDACTED]' for sensitive values)
 */
function redactValue(value: any): any {
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      return value.substring(0, MAX_STRING_LENGTH) + '...[truncated]';
    }
    return value;
  }
  return value;
}

/**
 * Sanitize an object recursively, redacting sensitive fields and limiting depth
 */
export function sanitizeLogPayload(
  obj: any,
  depth = 0,
  seen = new WeakSet()
): any {
  // Depth limit
  if (depth > MAX_DEPTH) {
    return '[Max Depth Reached]';
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return redactValue(obj);
  }

  // Handle circular references
  if (seen.has(obj)) {
    return '[Circular Reference]';
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    seen.add(obj);
    const result = obj.map((item) => sanitizeLogPayload(item, depth + 1, seen));
    seen.delete(obj);
    return result;
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle Error
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack ? redactValue(String(obj.stack)) : undefined,
    };
  }

  // Handle objects
  seen.add(obj);
  const result: any = {};
  
  try {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (isSensitiveKey(key)) {
          result[key] = '[REDACTED]';
        } else {
          try {
            result[key] = sanitizeLogPayload(obj[key], depth + 1, seen);
          } catch {
            result[key] = '[Serialization Error]';
          }
        }
      }
    }
  } catch {
    return '[Object Serialization Failed]';
  } finally {
    seen.delete(obj);
  }

  return result;
}
