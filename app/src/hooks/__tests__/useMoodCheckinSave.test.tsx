import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ write: vi.fn(), grade: vi.fn(), alert: vi.fn(), debug: vi.fn() }));
vi.mock('@/lib/api', () => ({ createMoodCheckin: mocks.write }));
vi.mock('@/lib/forecastJournal', () => ({ gradeForecastWithMood: mocks.grade }));
vi.mock('@/lib/logger', () => ({ logger: { debug: mocks.debug } }));
vi.mock('react-native', () => ({ Alert: { alert: mocks.alert } }));
vi.mock('@/components/ui/ReclaimButton', () => ({ ReclaimButton: 'ReclaimButton' }));
import { useMoodCheckinSave } from '../useMoodCheckinSave';
import { MoodCheckinSaveButton } from '@/components/mood/MoodCheckinSaveButton';

let renderer: ReactTestRenderer;
let model: ReturnType<typeof useMoodCheckinSave>;
const invalidate = vi.fn();
const refreshInsight = vi.fn();
function Harness({ rating = 7, tags = ['calm'] }: { rating?: number; tags?: string[] }) {
  model = useMoodCheckinSave({ rating, tags, invalidate, refreshInsight });
  return <MoodCheckinSaveButton onSave={model.save} />;
}
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const button = () => renderer.root.findByType('ReclaimButton' as any);
beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubGlobal('__DEV__', true);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.write.mockResolvedValue(undefined);
  mocks.grade.mockResolvedValue('Forecast reviewed.');
  invalidate.mockResolvedValue(undefined);
  refreshInsight.mockResolvedValue(undefined);
  await act(async () => { renderer = create(<Harness />); });
  await act(async () => { model.setNote('  original note  '); });
});
afterEach(async () => { await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });

it('preserves a new draft during persistence and saves only the submitted values once', async () => {
  const write = deferred();
  mocks.write.mockReturnValueOnce(write.promise);
  let save!: Promise<void>;
  const press = button().props.onPress;
  await act(async () => { save = press(); await press(); await press(); });
  await act(async () => {
    model.setNote('next note');
    renderer.update(<Harness rating={4} tags={['tired']} />);
  });
  expect(mocks.write).toHaveBeenCalledExactlyOnceWith({ rating: 7, tags: ['calm'], note: 'original note' });
  expect(button().props.disabled).toBe(true);
  await act(async () => { write.resolve(); await save; });
  expect(model.note).toBe('next note');
  expect(mocks.grade).toHaveBeenCalledExactlyOnceWith(7);
  expect(mocks.alert).toHaveBeenCalledExactlyOnceWith('Logged', 'Forecast reviewed.');
  expect(button().props.disabled).toBe(false);
});

it('clears an unchanged submitted note only after persistence succeeds', async () => {
  const write = deferred();
  mocks.write.mockReturnValueOnce(write.promise);
  let save!: Promise<void>;
  await act(async () => { save = button().props.onPress(); });
  expect(model.note).toBe('  original note  ');
  await act(async () => { write.resolve(); await save; });
  expect(model.note).toBe('');
});

it.each(['invalidation', 'grading', 'insight'] as const)(
  'reports saved, not write-failed, when %s fails; all follow-ups still run', async failure => {
    const failing = { invalidation: invalidate, grading: mocks.grade, insight: refreshInsight }[failure];
    failing.mockRejectedValueOnce(new Error('refresh failed'));
    await act(async () => { await button().props.onPress(); });
    expect(mocks.write).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledOnce();
    expect(mocks.grade).toHaveBeenCalledOnce();
    expect(refreshInsight).toHaveBeenCalledOnce();
    expect(mocks.alert).toHaveBeenCalledExactlyOnceWith('Logged', expect.stringContaining('No need to save again'));
    expect(model.note).toBe('');
    expect(button().props.disabled).toBe(false);
  },
);

it('retains edits and the duplicate guard while a post-write refresh is pending', async () => {
  const refresh = deferred();
  refreshInsight.mockReturnValueOnce(refresh.promise);
  let save!: Promise<void>;
  await act(async () => { save = button().props.onPress(); });
  expect(model.note).toBe('');
  await act(async () => { model.setNote('new draft after write'); });
  await act(async () => { await button().props.onPress(); });
  expect(mocks.write).toHaveBeenCalledOnce();
  await act(async () => { refresh.reject(new Error('refresh failed')); await save; });
  expect(model.note).toBe('new draft after write');
  expect(mocks.alert).toHaveBeenCalledExactlyOnceWith('Logged', expect.stringContaining('Check-in saved.'));
});

it('preserves the draft after a real write failure and permits one explicit retry', async () => {
  const write = deferred();
  mocks.write.mockReturnValueOnce(write.promise);
  let save!: Promise<void>;
  await act(async () => { save = button().props.onPress(); });
  await act(async () => { write.reject(new Error('storage unavailable')); await save; });
  expect(model.note).toBe('  original note  ');
  expect(mocks.alert).toHaveBeenCalledExactlyOnceWith('Error', 'storage unavailable');
  expect(invalidate).not.toHaveBeenCalled();
  expect(mocks.grade).not.toHaveBeenCalled();
  expect(refreshInsight).not.toHaveBeenCalled();
  expect(button().props.disabled).toBe(false);
  await act(async () => { await button().props.onPress(); });
  expect(mocks.write).toHaveBeenCalledTimes(2);
  expect(model.note).toBe('');
  expect(mocks.alert).toHaveBeenLastCalledWith('Logged', 'Forecast reviewed.');
});
