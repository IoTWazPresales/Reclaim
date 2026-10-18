import React from 'react';
import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionPreviewModal from '../SessionPreviewModal';
import { previewExerciseIssues, type PreviewDiagnosticLocation } from '../SessionPreviewProgrammeReview';
import { assertStartableProgramme } from '@/lib/training/buildProgramDaySession';
import { frozenSessionProjection } from '@/lib/training/programmeProjection';
import type { SessionPlan } from '@/lib/training/types';
import type { ProgrammeValidationIssue } from '@/lib/training/weeklyProgrammeValidator';
import catalog from '@/lib/training/catalog/exercises.v1.json';

const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as {
  renderToStaticMarkup: (node: React.ReactNode) => string;
};
const controls = vi.hoisted(() => ({ buttons: [] as any[] }));
vi.mock('react-native', () => ({
  View: ({ children }: any) => <div>{children}</div>,
  ScrollView: ({ children }: any) => <div>{children}</div>,
  Pressable: ({ children }: any) => <div>{children}</div>,
  Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 400, height: 800 }),
}));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('react-native-paper', () => {
  const Box = ({ children }: any) => <div>{children}</div>;
  return { Portal: Box, Modal: Box, Card: Object.assign(Box, { Content: Box }), Text: Box, Divider: Box,
    Button: (props: any) => { controls.buttons.push(props); return <button disabled={props.disabled}>{props.children}</button>; },
    useTheme: () => ({ colors: { elevation: {} } }),
  };
});
vi.mock('@/theme', () => ({ useAppTheme: () => ({ spacing: { xs: 4, sm: 8, md: 16, lg: 24 }, borderRadius: {} }) }));
vi.mock('@/theme/reclaimVisualLanguage', () => ({ reclaimPrimaryCapsuleButton: () => ({}), reclaimTertiaryOutlineCapsuleButton: () => ({}) }));
vi.mock('@/components/ui/FeatureCardHeader', () => ({ FeatureCardHeader: () => <div>Session Preview</div> }));
vi.mock('../ExerciseDetailsModal', () => ({ default: () => null }));

const location: PreviewDiagnosticLocation = { weekIndex: 1, dayKey: '3', slots: [{ slotId: '1:0', exerciseId: 'leg_press' }] };
const issue = (overrides: Partial<ProgrammeValidationIssue> = {}): ProgrammeValidationIssue => ({
  code: 'load_requires_confirmation', severity: 'warning', message: 'Original load diagnostic.', provenance: 'synthetic:test',
  weekIndex: 1, dayKey: '3', exerciseId: 'leg_press', ...overrides,
});
function fixture(issues = [issue()]): SessionPlan {
  const exercise = catalog.find(ex => ex.id === 'leg_press')!;
  return {
    id: 'synthetic-preview', template: 'legs', goals: { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 },
    constraints: { availableEquipment: [], injuries: [], forbiddenMovements: [], timeBudgetMinutes: 60 },
    userState: { experienceLevel: 'beginner', estimated1RM: {} }, weekIndex: 1,
    exercises: [{ exerciseId: exercise.id, exercise, orderIndex: 0, priority: 'primary', intents: exercise.intents,
      plannedSets: [{ setIndex: 1, targetReps: 10, suggestedWeight: 0, restSeconds: 90 }],
      decisionTrace: { intent: exercise.intents, goalBias: {}, constraintsApplied: [], selectionReason: '', rankedAlternatives: [], confidence: 1 } }],
    estimatedDurationMinutes: 30, createdAt: '2026-10-18T00:00:00Z',
    programmeValidation: { policyVersion: 'synthetic', status: 'feasible', issues: [] },
    weeklyValidation: { status: 'unresolved', issues, coverage: [], weekIndex: 1, policyVersion: 'synthetic', strategyId: 'synthetic' },
  } as SessionPlan;
}
const confirm = vi.fn();
function render(plan: SessionPlan, diagnosticLocation: PreviewDiagnosticLocation | undefined = location) {
  return renderToStaticMarkup(<SessionPreviewModal visible plan={plan} diagnosticLocation={diagnosticLocation}
    sessionMode="normal" onSessionModeChange={vi.fn()} onCancel={vi.fn()} onConfirm={confirm} />);
}
beforeEach(() => { controls.buttons.length = 0; confirm.mockClear(); });

describe('SessionPreviewModal programme review', () => {
  it('shows unresolved review, required weight confirmation and original diagnostic without prescribing zero kg', () => {
    const plan = fixture();
    const before = JSON.stringify(plan);
    const html = render(plan);
    expect(html).toContain('Programme week unresolved');
    expect(html).toContain('weight confirmation required');
    expect(html).toContain('Original load diagnostic.');
    expect(html).toContain('load_requires_confirmation');
    expect(html).toContain('synthetic:test');
    expect(html).not.toMatch(/0\s*kg/);
    expect(JSON.stringify(plan)).toBe(before);
  });

  it('explains incomplete history as a barrier to automatic progression', () => {
    const html = render(fixture([issue({ code: 'history_evidence_unverified', message: 'Original history barrier.' })]));
    expect(html).toContain('History is incomplete or unsupported and cannot justify automatic progression');
    expect(html).toContain('Original history barrier.');
  });

  it('does not imply an exercise confirmation for a week-only policy warning', () => {
    const html = render(fixture([issue({ code: 'policy_unresolved', message: 'Policy review pending.', dayKey: undefined, exerciseId: undefined })]));
    expect(html).toContain('Programme week unresolved');
    expect(html).toContain('Policy review pending.');
    expect(html).not.toContain('confirmation required');
    expect(html).not.toContain('exercises need confirmation');
  });

  it.each(['valid', 'unresolved', 'invalid'] as const)('renders %s independently from daily feasibility', status => {
    const plan = fixture([]);
    plan.weeklyValidation!.status = status;
    expect(render(plan)).toContain(status === 'valid' ? 'Programme week validated.' : `Programme week ${status}.`);
    expect(plan.programmeValidation!.status).toBe('feasible');
  });

  it('never calls missing legacy diagnostics validated and preserves historical load display', () => {
    const plan = fixture();
    delete plan.weeklyValidation;
    plan.exercises[0].plannedSets[0].suggestedWeight = 42;
    const html = render(plan);
    expect(html).toContain('Programme diagnostics unavailable');
    expect(html).not.toContain('week validated');
    expect(html).not.toContain('confirmation required');
    expect(html).toContain('42kg');
  });

  it('matches original day, exercise, week and optional slot without borrowing another exposure', () => {
    const plan = fixture([
      issue({ message: 'Selected exposure.', slotId: '1:0' }),
      issue({ message: 'Other day.', dayKey: '5' }), issue({ message: 'Other exercise.', exerciseId: 'bench_press' }),
      issue({ message: 'Other slot.', slotId: '1:9' }), issue({ message: 'Other week.', weekIndex: 2 }),
      issue({ message: 'Week warning.', dayKey: undefined, exerciseId: undefined }),
    ]);
    expect(previewExerciseIssues(plan, location, 'leg_press').map(i => i.message)).toEqual(['Selected exposure.']);
    const html = render(plan);
    expect(html).toContain('Selected exposure.');
    expect(html).not.toContain('Other day.');
    expect(html).not.toContain('Other week.');
    expect(html).toContain('Week-level review');
    expect(html.match(/Week warning\./g)).toHaveLength(1);
    expect(html).toContain('Selected-day review'); // Unmatched identities stay separate, once.
    expect(html.match(/Other slot\./g)).toHaveLength(1);
  });

  it('retains repeated genuine issue occurrences without multiplying the weekly result per exercise', () => {
    const plan = fixture([issue(), issue(), issue({ dayKey: '5', message: 'Later exposure.' }),
      issue({ dayKey: undefined, exerciseId: undefined, message: 'Week only.' })]);
    const html = render(plan);
    expect(html.match(/Original load diagnostic\./g)).toHaveLength(2);
    expect(html.match(/Week only\./g)).toHaveLength(1);
    expect(html).not.toContain('Later exposure.');
    expect(render(plan, { ...location, dayKey: '5' })).toContain('Later exposure.');
  });

  it('does not infer exercise locations when the selected day is unavailable or from a different week', () => {
    for (const loc of [undefined, { ...location, weekIndex: 2 }]) {
      const plan = fixture();
      expect(previewExerciseIssues(plan, loc, 'leg_press')).toEqual([]);
      // Explicit props avoid the render helper default for undefined.
      const html = renderToStaticMarkup(<SessionPreviewModal visible plan={plan} diagnosticLocation={loc}
        sessionMode="normal" onSessionModeChange={vi.fn()} onCancel={vi.fn()} onConfirm={confirm} />);
      expect(html).toContain('Exercise warning locations unavailable');
      expect(html).not.toContain('Original load diagnostic.');
    }
  });

  it('keeps ambiguous repeated exercise IDs and unmatched slots in selected-day review once', () => {
    const plan = fixture([issue({ slotId: '1:0' })]);
    expect(previewExerciseIssues(plan, { ...location, slots: [] }, 'leg_press')).toEqual([]);
    expect(render(plan, { ...location, slots: [] }).match(/Original load diagnostic\./g)).toHaveLength(1);
    plan.exercises.push({ ...plan.exercises[0], orderIndex: 1 });
    expect(previewExerciseIssues(plan, location, 'leg_press')).toEqual([]);
    const html = render(plan);
    expect(html).toContain('Selected-day review');
    expect(html.match(/Original load diagnostic\./g)).toHaveLength(1);
  });

  it('does not project current warnings onto frozen prescriptions, including empty snapshots', () => {
    const plan = fixture();
    const items = [{ id: 'synthetic', exercise_id: 'leg_press', order_index: 0,
      planned: { sets: [{ setIndex: 1, targetReps: 8, suggestedWeight: 55, restSeconds: 90 }], priority: 'primary', decisionTrace: plan.exercises[0].decisionTrace } }];
    const frozen = frozenSessionProjection(plan, items as any);
    const html = render(frozen);
    expect(html).toContain('55kg');
    expect(html).toContain('Programme diagnostics unavailable');
    expect(html).not.toContain('Original load diagnostic.');
    expect(render(frozenSessionProjection(plan, []))).not.toContain('Original load diagnostic.');
    expect(plan.exercises[0].plannedSets[0].suggestedWeight).toBe(0);
  });

  it('keeps warning-only Start enabled and preserves the separate hard-error guard', () => {
    const plan = fixture();
    render(plan);
    const start = controls.buttons.find(button => button.children === 'Start session');
    expect(start.disabled).toBeFalsy();
    start.onPress(); // Synthetic callback only: no session or API call.
    expect(confirm).toHaveBeenCalledOnce();
    expect(() => assertStartableProgramme(plan)).not.toThrow();
    plan.programmeValidation!.status = 'infeasible';
    expect(() => assertStartableProgramme(plan)).toThrow();
    plan.programmeValidation!.status = 'feasible';
    plan.programmeValidation!.issues = [{ code: 'synthetic_error', severity: 'error', message: 'Blocked.' }];
    expect(() => assertStartableProgramme(plan)).toThrow();
  });
});
