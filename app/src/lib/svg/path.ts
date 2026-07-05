/**
 * react-native-svg (horcrux PathParser) rejects NaN/Infinity, scientific notation,
 * empty/malformed `d` strings, and command-arity mismatches (e.g. C with 4 numbers).
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

const PATH_NUMBER_RE = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

/** Per-command coordinate count (one repetition). M allows 2+ even pairs (implicit lineto). */
const COMMAND_ARITY: Record<string, number | 'moveto' | 'close'> = {
  M: 'moveto',
  m: 'moveto',
  Z: 'close',
  z: 'close',
  L: 2,
  l: 2,
  H: 1,
  h: 1,
  V: 1,
  v: 1,
  C: 6,
  c: 6,
  S: 4,
  s: 4,
  Q: 4,
  q: 4,
  T: 2,
  t: 2,
  A: 7,
  a: 7,
};

function parseSegmentNumbers(segment: string): number[] {
  const matches = segment.match(PATH_NUMBER_RE);
  if (!matches) return [];
  return matches.map((t) => Number(t));
}

/** Verify each path command is followed by a valid multiple of its required coordinate count. */
export function hasValidPathCommandArity(d: string): boolean {
  const commandRe = /[MmLlHhVvCcSsQqTtAaZz]/g;
  const commands: Array<{ letter: string; index: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = commandRe.exec(d)) !== null) {
    commands.push({ letter: match[0], index: match.index });
  }
  if (commands.length === 0) return false;

  for (let i = 0; i < commands.length; i++) {
    const { letter, index } = commands[i];
    const nextIndex = i + 1 < commands.length ? commands[i + 1].index : d.length;
    const nums = parseSegmentNumbers(d.slice(index + 1, nextIndex));
    const arity = COMMAND_ARITY[letter];
    if (arity === 'close') {
      if (nums.length > 0) return false;
      continue;
    }
    if (arity === 'moveto') {
      if (nums.length < 2 || nums.length % 2 !== 0) return false;
      continue;
    }
    if (nums.length === 0 || nums.length % arity !== 0) return false;
  }
  return true;
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
  if (!hasValidPathCommandArity(s)) return false;
  return true;
}

export function logInvalidPathD(d: string, source: string): void {
  if (!__DEV__) return;
  logger.warn('[SVG] Invalid path d skipped', { source, d: d.slice(0, 160) });
}
