const REDACT_KEY_PATTERN = /(password|token|secret|apikey|api_key|authorization|cookie|session|anonkey|auth)/i;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[max-depth]';

  if (value == null) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 80).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 120);
    for (const [key, raw] of entries) {
      if (REDACT_KEY_PATTERN.test(key)) {
        out[key] = '[redacted]';
        continue;
      }
      out[key] = sanitizeValue(raw, depth + 1);
    }
    return out;
  }

  return String(value);
}

export function sanitizeFeedbackContext(context: unknown): Record<string, unknown> {
  const sanitized = sanitizeValue(context);
  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    return { value: sanitized as unknown };
  }
  return sanitized as Record<string, unknown>;
}
