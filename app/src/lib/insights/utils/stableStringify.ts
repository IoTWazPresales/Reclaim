type JsonPrimitive = string | number | boolean | null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function serialize(value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.map((item) => serialize(item)).join(',');
    return `[${items}]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `"${key}":${serialize((value as Record<string, unknown>)[key])}`);
    return `{${entries.join(',')}}`;
  }

  if (value instanceof Date) {
    return `"${value.toISOString()}"`;
  }

  return JSON.stringify(value as JsonPrimitive);
}

export default function stableStringify(value: unknown): string {
  return serialize(value);
}

