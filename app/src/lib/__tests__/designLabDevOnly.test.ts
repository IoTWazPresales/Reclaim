import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(__dirname, '../../..');
const SRC_ROOT = path.join(APP_ROOT, 'src');

const SKIP_DIRS = new Set(['__tests__', 'node_modules', 'dev']);
const SOURCE_EXT = new Set(['.ts', '.tsx']);

function walk(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push(full);
        continue;
      }
      if (!SOURCE_EXT.has(path.extname(entry.name))) continue;
      out.push(full);
    }
  }
  return out;
}

function windowBefore(source: string, index: number, size = 500): string {
  return source.slice(Math.max(0, index - size), index);
}

describe('Design Lab is __DEV__-only (N-0038)', () => {
  const loaderPath = path.join(SRC_ROOT, 'screens/dev/loadDesignLabScreen.ts');
  const loader = fs.readFileSync(loaderPath, 'utf8');

  it('loads the lab module only behind __DEV__', () => {
    expect(loader).toMatch(/__DEV__/);
    expect(loader).toMatch(/require\('@\/screens\/dev\/DesignLabScreen'\)/);
    expect(loader).toMatch(/DesignLabUnavailable/);
  });

  it('navigators import the DEV loader, not the lab module directly', () => {
    const appNav = fs.readFileSync(path.join(SRC_ROOT, 'routing/AppNavigator.tsx'), 'utf8');
    const rootNav = fs.readFileSync(path.join(SRC_ROOT, 'routing/RootNavigator.tsx'), 'utf8');
    expect(appNav).toContain("from '@/screens/dev/loadDesignLabScreen'");
    expect(rootNav).toContain("from '@/screens/dev/loadDesignLabScreen'");
    expect(appNav).not.toMatch(/from ['"]@\/screens\/dev\/DesignLabScreen['"]/);
    expect(rootNav).not.toMatch(/from ['"]@\/screens\/dev\/DesignLabScreen['"]/);
  });

  it('every production DesignLab route/entry/navigate sits inside a __DEV__ window', () => {
    const files = walk(SRC_ROOT).filter((file) => !file.endsWith(`${path.sep}navigation${path.sep}types.ts`));
    const hits: string[] = [];
    const usage = /(?:name=["']DesignLab["']|navigate\(\s*['"]DesignLab['"]|goDrawer\(\s*['"]DesignLab['"]|label:\s*['"]Design Lab)/g;

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      usage.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = usage.exec(source))) {
        const prelude = windowBefore(source, match.index);
        if (!prelude.includes('__DEV__')) {
          hits.push(`${path.relative(SRC_ROOT, file)}:${match[0]}`);
        }
      }
      if (/from ['"]@\/screens\/dev\/DesignLabScreen['"]/.test(source)) {
        hits.push(`${path.relative(SRC_ROOT, file)}:direct-import`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('deep-link config does not register DesignLab', () => {
    const rootNav = fs.readFileSync(path.join(SRC_ROOT, 'routing/RootNavigator.tsx'), 'utf8');
    const linkingBlock = rootNav.match(/const linking[\s\S]*?;/);
    expect(linkingBlock?.[0] ?? '').not.toMatch(/DesignLab/);
  });
});
