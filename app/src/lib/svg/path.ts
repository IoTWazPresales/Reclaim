/**
 * react-native-svg (horcrux PathParser) rejects NaN/Infinity, scientific notation,
 * and empty/malformed `d` strings. Use for every dynamic Path `d` on Android Fabric.
 */
import { logger } from '@/lib/logger';

export function formatSvgNum(value: number, fallback = 0): string {
  const n = Number.isFinite(value) ? value : fallback;
  const rounded = Math.round(n * 100) / 100;
  const text = String(rounded);
  if (text.includes('e') || text.includes('E')) {
    return rounded.toFixed(2).replace(/\.?0+$/, '');
  }
  return text;
}

/** Horcrux-safe path `d` validation — conservative; skips render rather than crash. */
export function isValidPathD(d: string | null | undefined): d is string {
  if (!d || !d.trim()) return false;
  const s = d.trim();
  if (/NaN|Infinity|undefined/i.test(s)) return false;
  if (!/^[Mm]/.test(s)) return false;
  // Double decimal or digit-letter-digit glue (e.g. h3l) breaks PathParser.parse_number.
  if (/\d+\.\d*\./.test(s)) return false;
  if (/(?<=[\d.])[a-df-wyzA-DF-WYZ](?=[\d.-])/.test(s)) return false;
  return true;
}

export function logInvalidPathD(d: string, source: string): void {
  if (!__DEV__) return;
  logger.warn('[SVG] Invalid path d skipped', { source, d: d.slice(0, 160) });
}
