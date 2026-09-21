import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('react-native-paper', () => ({ ActivityIndicator: 'ActivityIndicator', Text: 'Text', useTheme: () => ({ colors: { background: '#fff' } }) }));
import { PrivacyOperationGate } from '../PrivacyOperationGate';
import { beginPrivacyOperation, getPrivacyOperationOwner } from '@/lib/privacyOperation';

let renderer: ReactTestRenderer;
let release: (() => void) | undefined;
afterEach(async () => {
  await act(async () => { release?.(); renderer?.unmount(); });
});

it('removes sign-in navigation during cleanup, announces busy, and restores it only after release', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  function Auth() { return <>{'Auth controls'}</>; }
  await act(async () => { renderer = create(<PrivacyOperationGate><Auth /></PrivacyOperationGate>); });
  expect(renderer.root.findAllByType(Auth)).toHaveLength(1);
  await act(async () => { release = beginPrivacyOperation('user-a'); });
  expect(renderer.root.findAllByType(Auth)).toHaveLength(0);
  const busy = renderer.root.findByProps({ accessibilityLiveRegion: 'polite' });
  expect(busy.props.accessibilityState).toEqual({ busy: true });
  expect(JSON.stringify(renderer.toJSON())).toContain('Please keep Reclaim open');
  await act(async () => { release!(); release!(); });
  expect(getPrivacyOperationOwner()).toBeNull();
  expect(renderer.root.findAllByType(Auth)).toHaveLength(1);
});

it('guards the actual root NavigationContainer, including the Auth route', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../routing/RootNavigator.tsx'), 'utf8');
  expect(source).toMatch(/<PrivacyOperationGate>\s*<NavigationContainer[\s\S]*<\/NavigationContainer>\s*<\/PrivacyOperationGate>/);
});
