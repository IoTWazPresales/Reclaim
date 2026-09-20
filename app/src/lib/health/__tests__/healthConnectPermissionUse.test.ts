import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HEALTH_CONNECT_ANDROID_READ_PERMISSION_TO_RECORD,
  HEALTH_CONNECT_ANDROID_WRITE_PERMISSION_TO_RECORD,
  HEALTH_CONNECT_DEFAULT_METRICS,
  HEALTH_CONNECT_FORBIDDEN_REQUEST_METRICS,
  LOCATION_ANDROID_PERMISSIONS,
  recordsForRequestedMetrics,
} from '@/lib/health/healthConnectMetrics';

const APP_ROOT = path.resolve(__dirname, '../../../..');
const SRC_ROOT = path.join(APP_ROOT, 'src');
const PLUGIN = path.join(APP_ROOT, 'plugins/withHealthConnectPermissions.js');
const APP_CONFIG = path.join(APP_ROOT, 'app.config.ts');
const ANDROID_DIR = path.join(APP_ROOT, 'android');

const SKIP_DIR_NAMES = new Set(['__tests__', 'node_modules', 'designLab']);
const SKIP_FILE_RE = /\.(test|spec)\.(ts|tsx|js|mjs|cjs)$/;
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

const READ_RECORDS_RE = /readRecords\(\s*['"]([A-Za-z0-9_]+)['"]/g;
const RECORD_TYPE_RE = /recordType:\s*['"]([A-Za-z0-9_]+)['"]/g;
const INSERT_RECORD_TYPE_RE = /recordType:\s*['"]([A-Za-z0-9_]+)['"]/g;
const ANDROID_PERM_RE = /android\.permission(?:\.health)?\.[A-Z0-9_]+/g;

function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) continue;
        stack.push(full);
        continue;
      }
      if (SKIP_FILE_RE.test(entry.name)) continue;
      if (!SOURCE_EXT.has(path.extname(entry.name))) continue;
      out.push(full);
    }
  }
  return out;
}

function collectMatches(files: string[], regex: RegExp): Set<string> {
  const found = new Set<string>();
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      found.add(match[1] ?? match[0]);
    }
  }
  return found;
}

function collectPermissionStrings(files: string[]): Set<string> {
  const found = new Set<string>();
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    ANDROID_PERM_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ANDROID_PERM_RE.exec(text))) {
      found.add(match[0]);
    }
    for (const loc of LOCATION_ANDROID_PERMISSIONS) {
      const short = loc.replace('android.permission.', '');
      if (text.includes(`'${short}'`) || text.includes(`"${short}"`) || text.includes(loc)) {
        found.add(loc);
      }
    }
  }
  return found;
}

function parsePluginPermissionLists(pluginSource: string): { read: string[]; write: string[] } {
  const readBlock = pluginSource.match(/HEALTH_CONNECT_READ_PERMISSIONS\s*=\s*\[([\s\S]*?)\];/);
  const writeBlock = pluginSource.match(/HEALTH_CONNECT_WRITE_PERMISSIONS\s*=\s*\[([\s\S]*?)\];/);
  const pull = (block: string | undefined) =>
    [...(block ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
  return { read: pull(readBlock?.[1]), write: pull(writeBlock?.[1]) };
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort();
}

describe('Health Connect + location permission use (N-0036)', () => {
  const pluginSource = fs.readFileSync(PLUGIN, 'utf8');
  const pluginPerms = parsePluginPermissionLists(pluginSource);
  const runtimeSrcFiles = walkFiles(SRC_ROOT).filter(
    (file) => path.basename(file) !== 'healthConnectMetrics.ts',
  );
  const declarationFiles = [
    PLUGIN,
    APP_CONFIG,
    ...walkFiles(path.join(APP_ROOT, 'plugins')),
    ...walkFiles(ANDROID_DIR),
  ].filter((file) => fs.existsSync(file));

  it('declared plugin reads equal connect-time requested records', () => {
    const declaredReads = pluginPerms.read.map((perm) => {
      const record = HEALTH_CONNECT_ANDROID_READ_PERMISSION_TO_RECORD[perm];
      expect(record, `unmapped plugin read permission ${perm}`).toBeTruthy();
      return record;
    });
    const requested = recordsForRequestedMetrics(HEALTH_CONNECT_DEFAULT_METRICS);
    expect(sorted(declaredReads)).toEqual(requested);
    expect(HEALTH_CONNECT_FORBIDDEN_REQUEST_METRICS.every((m) => !HEALTH_CONNECT_DEFAULT_METRICS.includes(m))).toBe(
      true,
    );
  });

  it('every declared/requested Health Connect record is actually used in product source', () => {
    const usedReads = collectMatches(runtimeSrcFiles, READ_RECORDS_RE);
    const requested = recordsForRequestedMetrics(HEALTH_CONNECT_DEFAULT_METRICS);
    const unusedRequested = requested.filter((record) => !usedReads.has(record));
    const usedUndeclared = [...usedReads].filter((record) => !requested.includes(record));
    expect(unusedRequested, 'requested but never readRecords()').toEqual([]);
    expect(usedUndeclared, 'readRecords() without being requested at connect time').toEqual([]);
  });

  it('declared writes equal insertRecords / requestPermission write types', () => {
    const declaredWrites = pluginPerms.write.map((perm) => {
      const record = HEALTH_CONNECT_ANDROID_WRITE_PERMISSION_TO_RECORD[perm];
      expect(record, `unmapped plugin write permission ${perm}`).toBeTruthy();
      return record;
    });
    const usedRecordTypes = collectMatches(runtimeSrcFiles, RECORD_TYPE_RE);
    const usedInserts = collectMatches(runtimeSrcFiles, INSERT_RECORD_TYPE_RE);
    for (const record of declaredWrites) {
      expect(
        usedRecordTypes.has(record) || usedInserts.has(record),
        `${record} is declared for write but never requested or inserted`,
      ).toBe(true);
    }
  });

  it('location family is declared, requested, and used together (currently none)', () => {
    const permissionHits = collectPermissionStrings(declarationFiles);
    const declaredLocation = LOCATION_ANDROID_PERMISSIONS.filter((perm) => permissionHits.has(perm));

    const locationUseRe =
      /expo-location|ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|FOREGROUND_SERVICE_LOCATION|WRITE_EXERCISE_ROUTE|READ_EXERCISE_ROUTES|Geolocation|watchPositionAsync|requestForegroundPermissionsAsync|foregroundServiceType:\s*['"]location['"]/;
    const usedLocationFiles = runtimeSrcFiles.filter((file) => locationUseRe.test(fs.readFileSync(file, 'utf8')));

    expect(declaredLocation, 'location must not be declared until R3 uses it').toEqual([]);
    expect(usedLocationFiles, 'location APIs must not ship until declared+requested').toEqual([]);
  });
});
