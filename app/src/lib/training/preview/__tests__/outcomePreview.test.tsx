import React from 'react';
import { createRequire } from 'node:module';
// The repository includes react-dom but no @types/react-dom; keep this test-only boundary typed.
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as {
  renderToStaticMarkup: (node: React.ReactNode) => string;
};
import { describe, expect, it, vi } from 'vitest';
import { OutcomePreviewPanel } from '../../../../components/training/OutcomePreviewPanel';
import type { PreviewSettings } from '../index';

// Render the real panel and generator; replace native presentation primitives only.
vi.mock('react-native', () => ({
  View: ({ children }: any) => <div>{children}</div>,
  ScrollView: ({ children }: any) => <div>{children}</div>,
  useWindowDimensions: () => ({ height: 800 }),
}));
vi.mock('react-native-paper', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  useTheme: () => ({ colors: {} }),
}));
vi.mock('@/theme', () => ({
  useAppTheme: () => ({ spacing: {}, borderRadius: {} }),
}));

const settings: PreviewSettings = {
  goals: { build_muscle: 4, build_strength: 4, lose_fat: 1, get_fitter: 1 },
  selectedWeekdays: [1, 3, 5], equipment: [], constraints: [], baselines: {},
  trainingMode: 'running', runningGoal: '5k',
};
const render = (overrides: Partial<PreviewSettings> = {}) =>
  renderToStaticMarkup(<OutcomePreviewPanel {...settings} {...overrides} />);

describe('R02 outcome preview state and copy', () => {
  it('renders prescribed run minutes and scopes distance and save claims', () => {
    const html = render();
    expect(html).toContain('20 minutes of running and walking');
    expect(html).toContain('distance goal does not prescribe a pace or determine these minutes');
    expect(html).toContain('Nothing is saved until you confirm');
    expect(html).not.toContain('Rep Ranges');
    expect(html).not.toContain('Sets per Session');
    expect(html).not.toContain('Example Exercise');
    expect(html).not.toContain('duration are not prescribed');
  });

  it('renders an empty selection and an infeasible programme as distinct unavailable states', () => {
    expect(render({ selectedWeekdays: [] })).toContain('Select training days');
    const unavailable = render({ trainingMode: 'hybrid' });
    expect(unavailable).toContain('Preview unavailable');
    expect(unavailable).not.toContain('minutes of running');
    expect(unavailable).not.toContain('goal is saved');
  });

  it('retains lifting presentation for a valid strength programme', () => {
    const html = render({ trainingMode: 'strength', muscleFrequency: 'once', selectedWeekdays: [1, 2, 3, 4, 5], equipment: ['barbell', 'bench', 'rack', 'dumbbells'] });
    expect(html).toContain('Rep Ranges');
    expect(html).toContain('Sets per Session');
    expect(html).not.toContain('minutes of running');
  });
});
