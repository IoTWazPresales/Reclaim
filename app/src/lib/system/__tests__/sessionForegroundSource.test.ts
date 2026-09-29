import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(__dirname, '../../../..');
const FORBIDDEN = ['react-native-background-actions', 'RNBackgroundActionsTask'];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'build' || entry.name === '.gradle') continue;
    if (entry.name === 'sessionForegroundSource.test.ts') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe('session foreground source shape', () => {
  it('does not depend on the prohibited background-actions transport', () => {
    const files = [
      path.join(APP_ROOT, 'package.json'),
      path.join(APP_ROOT, 'package-lock.json'),
      ...walk(path.join(APP_ROOT, 'src')),
    ];
    const hits = files.filter((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return FORBIDDEN.some((needle) => text.includes(needle));
    });
    expect(hits).toEqual([]);
  });

  it('registers one health foreground service and keeps the old library service out of the plugin registration', () => {
    const plugin = fs.readFileSync(
      path.join(APP_ROOT, 'plugins/withGuidedSessionForegroundService.js'),
      'utf8',
    );
    expect(plugin).toContain('ReclaimSessionForegroundService');
    expect(plugin).toContain("foregroundServiceType'] = FGS_TYPE");
    expect(plugin).toContain("const FGS_TYPE = 'health'");
    expect(plugin).toContain("android:stopWithTask'] = 'false'");
    expect(plugin).not.toContain("android:name': SERVICE_NAME");
    const servicePushes = plugin.match(/services\.push\(/g) ?? [];
    expect(servicePushes).toHaveLength(1);
  });
});
