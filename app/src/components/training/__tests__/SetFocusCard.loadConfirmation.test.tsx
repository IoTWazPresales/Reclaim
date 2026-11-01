import React from 'react';
import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SetFocusCard from '../SetFocusCard';
import RestCountdownCard from '../RestCountdownCard';
import SetFocusOverlay from '../SetFocusOverlay';
import { getExerciseById } from '@/lib/training/engine';

const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup: (node: React.ReactNode) => string };
const controls = vi.hoisted(() => ({ buttons: [] as any[] }));
vi.mock('react-native', () => ({ View: ({ children }: any) => <div>{children}</div>, Modal: ({ children }: any) => <div>{children}</div>, Pressable: ({ children }: any) => <div>{children}</div>, StyleSheet: { create: (styles: any) => styles } }));
vi.mock('react-native-paper', () => ({ Text: ({ children }: any) => <span>{children}</span>, IconButton: () => null, ProgressBar: () => null, Portal: ({ children }: any) => <div>{children}</div>,
  Button: (props: any) => { controls.buttons.push(props); return <button disabled={props.disabled}>{props.children}</button>; },
  useTheme: () => ({ colors: {} }) }));
vi.mock('@/theme', () => ({ useAppTheme: () => ({ spacing: {}, borderRadius: {} }) }));
vi.mock('@/theme/reclaimVisualLanguage', () => ({ reclaimPrimaryCapsuleButton: () => ({}), reclaimSecondaryCapsuleButton: () => ({}),
  reclaimGhostCapsuleButton: () => ({}), reclaimUtilityCardSurface: () => ({}), reclaimRecessedWell: () => ({}), reclaimChip: () => ({ container: {}, label: {} }) }));
vi.mock('../ExerciseIllustration', () => ({ default: () => null }));

beforeEach(() => { controls.buttons.length = 0; });
const render = (weight: number, flag?: boolean, exerciseId = 'dumbbell_bench_press') => renderToStaticMarkup(<SetFocusCard exercise={getExerciseById(exerciseId)!}
  setIndex={1} totalSets={3} plannedWeight={weight} plannedReps={7} loadRequiresConfirmation={flag}
  onDone={vi.fn()} onSkip={vi.fn()} onEdit={vi.fn()} onRpeSelect={vi.fn()} selectedRpe={null} isSessionEnded={false} />);

describe('new-build load confirmation in the started-session card', () => {
  it('shows no default kilogram and blocks unconfirmed Done', () => {
    const html = render(0, true);
    expect(html).toContain('Choose a weight');
    expect(html).not.toMatch(/0\s*kg|Bodyweight/);
    expect(controls.buttons.find(button => button.children === 'Done')?.disabled).toBe(true);
  });
  it('does not describe an uncalibrated carry as zero bodyweight', () => {
    const html = render(0, true, 'sandbag_carry');
    expect(html).toContain('Choose a load');
    expect(html).not.toMatch(/0\s*kg|Bodyweight|use 0/);
  });
  it('keeps old frozen kilograms and accepts a supplied positive load', () => {
    expect(render(60)).toContain('60');
    expect(controls.buttons.find(button => button.children === 'Done')?.disabled).toBe(false);
    controls.buttons.length = 0;
    expect(render(20, true)).not.toContain('Choose a weight');
    expect(controls.buttons.find(button => button.children === 'Done')?.disabled).toBe(false);
  });
  it('rest and notification overlay preserve confirmation semantics instead of displaying Bodyweight', () => {
    const rest = renderToStaticMarkup(<RestCountdownCard totalSeconds={90} remainingSeconds={60} isPaused={false}
      nextExerciseName="Dumbbell Bench Press" nextSetIndex={1} nextTotalSets={3} nextWeight={0} nextReps={7}
      loadRequiresConfirmation isNewExercise onSkipRest={vi.fn()} onExtend={vi.fn()} onTogglePause={vi.fn()} />);
    expect(rest).toContain('Weight confirmation required');
    expect(rest).not.toMatch(/0\s*kg|Bodyweight/);
    const overlay = renderToStaticMarkup(<SetFocusOverlay visible exerciseName="Dumbbell Bench Press" setIndex={1} totalSets={3}
      plannedWeight={0} plannedReps={7} loadRequiresConfirmation isCompleted={false} isResting={false}
      onDone={vi.fn()} onAdjust={vi.fn()} onClose={vi.fn()} />);
    expect(overlay).toContain('Weight confirmation required');
    expect(overlay).not.toMatch(/0\s*kg|Bodyweight/);
    expect(controls.buttons.find(button => button.children === 'Done')?.disabled).toBe(true);
  });
});
