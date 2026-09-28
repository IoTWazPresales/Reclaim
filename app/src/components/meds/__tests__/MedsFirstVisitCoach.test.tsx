import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('react-native-paper', () => ({ Button: 'Button', IconButton: 'IconButton', Text: 'Text',
  useTheme: () => ({ colors: { onSurface: '#000', primary: '#123' } }) }));
vi.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'Icon' }));
vi.mock('@/components/ui/InformationalCard', () => ({ InformationalCard: 'InformationalCard' }));
vi.mock('@/theme', () => ({ useAppTheme: () => ({}) }));
vi.mock('@/theme/reclaimVisualLanguage', () => ({
  reclaimPrimaryCapsuleButton: () => ({}), reclaimGhostCapsuleButton: () => ({}),
}));
import { MedsFirstVisitCoach } from '../MedsFirstVisitCoach';

const props = { guideVisible: true, medications: [], status: 'success' as const,
  isFetching: false, onShowMe: vi.fn(), onDismiss: vi.fn() };
let renderer: ReactTestRenderer;
afterEach(async () => { await act(async () => renderer?.unmount()); vi.clearAllMocks(); });
async function mount(overrides: Partial<React.ComponentProps<typeof MedsFirstVisitCoach>> = {}) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => { renderer = create(<MedsFirstVisitCoach {...props} {...overrides} />); });
}

it('renders genuine empty-list coaching with working Show me and accessible dismissal', async () => {
  await mount();
  expect(JSON.stringify(renderer.toJSON())).toContain('Add a med to unlock reminders');
  const show = renderer.root.findAllByType('Button' as any).find(node => node.props.children === 'Show me')!;
  await act(async () => { show.props.onPress(); });
  expect(props.onShowMe).toHaveBeenCalledOnce();
  const dismiss = renderer.root.findByProps({ accessibilityLabel: 'Dismiss coach' });
  await act(async () => { dismiss.props.onPress(); });
  expect(props.onDismiss).toHaveBeenCalledOnce();
});

it.each([1, 4])('renders no coach or empty spacer for %s existing medications', async count => {
  await mount({ medications: Array.from({ length: count }, (_, id) => ({ id })) });
  expect(renderer.toJSON()).toBeNull();
});

it.each([
  { status: 'pending' as const, medications: undefined },
  { status: 'error' as const, medications: undefined },
  { status: 'error' as const, medications: [] },
  { isFetching: true },
  { medications: undefined },
  { guideVisible: false },
])('does not misrepresent unknown, loading, error or dismissed state: %j', async state => {
  await mount(state);
  expect(renderer.toJSON()).toBeNull();
});

it('removes coaching when medications arrive without persisting a dismissal', async () => {
  await mount();
  await act(async () => { renderer.update(<MedsFirstVisitCoach {...props} medications={[{ id: 'synthetic' }]} />); });
  expect(renderer.toJSON()).toBeNull();
  expect(props.onDismiss).not.toHaveBeenCalled();
  await act(async () => { renderer.update(<MedsFirstVisitCoach {...props} />); });
  expect(JSON.stringify(renderer.toJSON())).toContain('Add a med to unlock reminders');
});

it('MedsScreen forwards query truth without swallowing read errors into an empty list', () => {
  const screen = fs.readFileSync(path.resolve(__dirname, '../../../screens/MedsScreen.tsx'), 'utf8');
  expect(screen).toMatch(/const medsQ = useQuery\(\{\s*queryKey: \['meds'\],\s*queryFn: listMeds,/);
  expect(screen).toMatch(/<MedsFirstVisitCoach\s+guideVisible=\{showMedsFirstVisitGuide\}\s+medications=\{medsQ.data\}\s+status=\{medsQ.status\}\s+isFetching=\{medsQ.isFetching\}/);
});
