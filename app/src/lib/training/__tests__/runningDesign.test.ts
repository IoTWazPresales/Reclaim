import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const design = readFileSync(resolve(__dirname, '../../../../../docs/training/RUNNING_DESIGN.md'), 'utf8');

describe('RUNNING_DESIGN.md', () => {
  it('cites progression, talk-test intensity, interference, and leaves the running deload cut undefined', () => {
    expect(design).toContain('RD-001');
    expect(design).toContain('RD-002');
    expect(design).toContain('RD-003');
    expect(design).toContain('RD-004');
    expect(design).toContain('RD-005');
    expect(design).toContain('21694556');
    expect(design).toContain('18277826');
    expect(design).toContain('22002517');
    expect(design).toContain('5 km');
    expect(design).toContain('10 km');
    expect(design).toContain('associated with');
    expect(design).not.toMatch(/\bcauses\b/);
    expect(design).toContain('The size of that minute cut is not defined');
    expect(design).toContain('No target pace');
  });
});
