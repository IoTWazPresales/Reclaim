import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/ReclaimButton', () => ({ ReclaimButton: 'ReclaimButton' }));
import { MoodCheckinSaveButton } from '../MoodCheckinSaveButton';

let renderer: ReactTestRenderer;
afterEach(async () => { await act(async () => renderer?.unmount()); });
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const button = () => renderer.root.findByType('ReclaimButton' as any);
async function mount(onSave: () => Promise<void>) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => { renderer = create(<MoodCheckinSaveButton onSave={onSave} />); });
}

it('blocks same-frame double/triple presses and exposes accessible progress through the whole save', async () => {
  const work = deferred();
  const onSave = vi.fn().mockReturnValue(work.promise);
  await mount(onSave);
  const press = button().props.onPress;
  let first!: Promise<void>;
  await act(async () => {
    first = press();
    await press(); await press();
  });
  expect(onSave).toHaveBeenCalledOnce();
  expect(button().props.disabled).toBe(true);
  expect(button().props.loading).toBe(true);
  expect(button().props.accessibilityState).toEqual({ disabled: true, busy: true });
  expect(button().props.accessibilityLabel).toBe('Saving check-in');
  await act(async () => { work.resolve(); await first; });
  expect(button().props.disabled).toBe(false);
  expect(button().props.accessibilityLabel).toBe('Log a quick check-in');
  await act(async () => { await button().props.onPress(); });
  expect(onSave).toHaveBeenCalledTimes(2);
});

it('keeps exclusion when a parent rerenders with another callback while saving', async () => {
  const work = deferred();
  const original = vi.fn().mockReturnValue(work.promise);
  const replacement = vi.fn().mockResolvedValue(undefined);
  await mount(original);
  let first!: Promise<void>;
  await act(async () => { first = button().props.onPress(); });
  await act(async () => { renderer.update(<MoodCheckinSaveButton onSave={replacement} />); });
  await act(async () => { await button().props.onPress(); });
  expect(replacement).not.toHaveBeenCalled();
  await act(async () => { work.resolve(); await first; });
  await act(async () => { await button().props.onPress(); });
  expect(replacement).toHaveBeenCalledOnce();
});

it('releases on failure so the same check-in can be retried', async () => {
  const work = deferred();
  const onSave = vi.fn().mockReturnValueOnce(work.promise).mockResolvedValue(undefined);
  await mount(onSave);
  let first!: Promise<void>;
  await act(async () => { first = button().props.onPress(); });
  const rejected = expect(first).rejects.toThrow('offline');
  await act(async () => { work.reject(new Error('offline')); await rejected; });
  expect(button().props.disabled).toBe(false);
  await act(async () => { await button().props.onPress(); });
  expect(onSave).toHaveBeenCalledTimes(2);
});

it('MoodScreen routes its canonical write through the guarded control', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../screens/MoodScreen.tsx'), 'utf8');
  expect(source).toMatch(/<MoodCheckinSaveButton\s+onSave=\{async[\s\S]*await createMoodCheckin\(/);
  expect(source.match(/await createMoodCheckin\(/g)).toHaveLength(1);
});
