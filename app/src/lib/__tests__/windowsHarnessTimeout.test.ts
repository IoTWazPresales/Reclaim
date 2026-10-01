import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const config = readFileSync(resolve(__dirname, '../../../vitest.config.ts'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../../package.json'), 'utf8')) as {
  scripts?: { test?: string };
};

describe('Windows full harness', () => {
  it('keeps every source test and raises only the default timeout', () => {
    expect(config).toContain("include: ['src/**/*.{test,spec}.ts?(x)']");
    expect(config).toContain("pool: 'threads'");
    expect(config).toContain('fileParallelism: false');
    expect(config).toContain('testTimeout: 30_000');
    expect(config).not.toContain('maxWorkers');
    expect(pkg.scripts?.test).toBe('vitest run');
  });
});
