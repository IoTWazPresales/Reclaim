import React from 'react';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import WeeklyProgrammeReview from '../WeeklyProgrammeReview';
import type { SessionPlan } from '@/lib/training/types';
import type { ProgrammeValidationIssue } from '@/lib/training/weeklyProgrammeValidator';
import { frozenSessionProjection, weeklyProgrammeSummary } from '@/lib/training/programmeProjection';

const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as {
  renderToStaticMarkup: (node: React.ReactNode) => string;
};
vi.mock('react-native', () => ({ View: ({ children }: any) => <div>{children}</div> }));
vi.mock('react-native-paper', () => ({ Text: ({ children }: any) => <p>{children}</p>,
  useTheme: () => ({ colors: { onSurface: '#000', onSurfaceVariant: '#333' } }),
}));
const issue = (overrides: Partial<ProgrammeValidationIssue> = {}): ProgrammeValidationIssue => ({
  code: 'load_requires_confirmation', severity: 'warning', message: 'Synthetic load warning', provenance: 'synthetic:test',
  exerciseId: 'leg_press', dayKey: '1', weekIndex: 1, ...overrides,
});
function plan(status: 'valid' | 'unresolved' | 'invalid' = 'unresolved', issues = [issue()], weekIndex = 1): SessionPlan {
  return { weekIndex, exercises: [], programmeValidation: { status: 'feasible', issues: [], policyVersion: 'synthetic' },
    weeklyValidation: { status, issues, weekIndex, policyVersion: 'synthetic', strategyId: 'synthetic', coverage: [] },
  } as unknown as SessionPlan;
}
type Entries = NonNullable<React.ComponentProps<typeof WeeklyProgrammeReview>['entries']>;
const render = (entries: Entries | undefined) => renderToStaticMarkup(<WeeklyProgrammeReview entries={entries} />);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe('weekly programme review presentation', () => {
  it('counts transported weekly references once and retains genuine repeated occurrences', () => {
    const proposal = plan('unresolved', [issue(), issue(), issue({ dayKey: '3' }), issue({ severity: 'error' })]);
    const entries = Array.from({ length: 5 }, () => ({ proposal: clone(proposal) }));
    const before = clone(entries);
    const html = render(entries);
    expect(html.match(/Week 1: unresolved/g)).toHaveLength(1);
    expect(html).toContain('3 warnings · 1 error');
    expect(html).toContain('Exercise weights may require confirmation');
    expect(html).not.toContain('invalid');
    expect(entries).toEqual(before);
  });

  it.each(['valid', 'unresolved', 'invalid'] as const)('displays the supplied %s status without inferring from daily feasibility', status => {
    const html = render([{ proposal: plan(status, status === 'valid' ? [] : [issue({ severity: status === 'invalid' ? 'error' : 'warning' })]) }]);
    expect(html).toContain(`Week 1: ${status}`);
    if (status === 'valid') expect(html).toContain('0 warnings · 0 errors');
    if (status === 'invalid') expect(html).toContain('0 warnings · 1 error');
  });

  it.each([undefined, []])('does not infer validity when entries are unavailable or empty', entries => {
    const html = render(entries);
    expect(html).toContain('Weekly review unavailable');
    expect(html).not.toContain('0 warnings');
    expect(html).not.toContain(': valid');
  });

  it('shows legacy and missing diagnostics as unavailable without changing daily status or volumes', () => {
    const legacy = plan();
    delete legacy.weeklyValidation;
    legacy.programmeValidation!.status = 'legacy';
    const entries = [{ proposal: legacy }];
    const before = clone(entries), volume = weeklyProgrammeSummary(entries);
    expect(render(entries)).toContain('Week 1: review unavailable');
    expect(render(entries)).toContain('older programmes may not include them');
    expect(entries).toEqual(before);
    expect(weeklyProgrammeSummary(entries)).toBe(volume);
  });

  it('keeps separate week statuses and reports partial missing diagnostics', () => {
    const missing = plan();
    delete missing.weeklyValidation;
    const html = render([{ proposal: plan('valid', []) }, { proposal: missing }, { proposal: plan('invalid', [issue({ severity: 'error' })], 2) }]);
    expect(html).toContain('Week 1: available diagnostics valid');
    expect(html).not.toContain('Week 1: valid');
    expect(html).toContain('Week 1: review unavailable');
    expect(html).toContain('Week 2: invalid');
  });

  it('excludes frozen/completed diagnostics, including empty snapshots, from current status and counts', () => {
    const historical = plan('invalid', [issue({ severity: 'error' })]);
    const entries = [{ proposal: historical, frozen: [] }, { proposal: plan('unresolved', [issue(), issue()]) }];
    const before = clone(entries);
    const html = render(entries);
    expect(html).toContain('Week 1: unresolved · 2 warnings · 0 errors');
    expect(html).not.toContain('Week 1: invalid');
    expect(html).toContain('historical prescriptions');
    expect(entries).toEqual(before);
    expect(render([{ proposal: historical, frozen: [] }])).toContain('only frozen or completed sessions');
    expect(render([{ proposal: frozenSessionProjection(historical, []), frozen: [] }])).not.toContain('1 error');
  });
});
