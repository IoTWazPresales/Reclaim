import React from 'react';
import { vi, describe, expect, it } from 'vitest';

vi.mock('react-native-svg', () => {
  const R = require('react');
  const el =
    (tag: string) =>
    ({ children, ...props }: any) =>
      R.createElement(tag, props, children);
  const Svg = el('svg');
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Circle: el('circle'),
    Defs: el('defs'),
    LinearGradient: el('linearGradient'),
    Path: el('path'),
    Stop: el('stop'),
  };
});

vi.mock('@/lib/api', () => ({
  logInsightFeedback: vi.fn().mockResolvedValue(undefined),
  updateInsightFeedback: vi.fn().mockResolvedValue(undefined),
  INSIGHT_FEEDBACK_REASON_LABELS: {},
}));

vi.mock('react-native', () => {
  const React = require('react');
  const createComponent =
    (tag: string) =>
    ({ children, ...props }: any) =>
      React.createElement(tag, props, children);

  class AnimatedValue {
    _value: number;
    constructor(v: number) {
      this._value = v;
    }
    setValue() {}
  }
  const timing = () => ({ start: (cb?: () => void) => cb?.() });
  const sequence = (a: unknown[]) => a;
  const loop = () => ({ start: () => ({ stop: () => {} }) });

  return {
    StyleSheet: {
      create: (styles: unknown) => styles,
      absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      hairlineWidth: 1,
    },
    View: createComponent('div'),
    Text: createComponent('span'),
    Easing: {
      inOut: (fn: (t: number) => number) => fn,
      sin: (t: number) => t,
      cubic: (t: number) => t,
    },
    Animated: {
      Value: AnimatedValue,
      timing,
      sequence,
      loop,
      View: createComponent('div'),
    },
    Pressable: createComponent('button'),
    Share: { share: () => Promise.resolve() },
    Modal: createComponent('div'),
    TouchableOpacity: createComponent('button'),
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web || obj.default,
    },
    TurboModuleRegistry: {
      get: () => null,
      getEnforcing: () => null,
    },
  };
});

vi.mock('react-native-paper', () => {
  const React = require('react');
  
  const ThemeContext = React.createContext({
    colors: {
      primary: '#53c9ca',
      secondary: '#53c9ca',
      surface: '#ffffff',
      secondaryContainer: '#e0def5',
      onSecondaryContainer: '#23104a',
      onSurfaceVariant: '#4a4a4a',
    },
    dark: false,
  });

  const PaperProvider = ({ theme, children }: any) =>
    React.createElement(ThemeContext.Provider, { value: theme }, children);

  const useTheme = () => React.useContext(ThemeContext);

  const createComponent =
    (tag: string) =>
    ({ children, ...props }: any) =>
      React.createElement(tag, props, children);

  const Card = createComponent('div') as any;
  Card.Content = createComponent('section');

  const Button = createComponent('button');
  const IconButton = createComponent('button');
  const Chip = createComponent('span');
  const Text = createComponent('span');

  const MD3LightTheme = {
    colors: {
      primary: '#53c9ca',
      secondary: '#53c9ca',
      surface: '#ffffff',
      secondaryContainer: '#e0def5',
      onSecondaryContainer: '#23104a',
      onSurfaceVariant: '#4a4a4a',
    },
    dark: false,
  };

  const MD3DarkTheme = {
    ...MD3LightTheme,
    dark: true,
  };

  return {
    PaperProvider,
    useTheme,
    Card,
    Button,
    IconButton,
    Chip,
    Text,
    MD3LightTheme,
    MD3DarkTheme,
  };
});

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

vi.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));
import renderer from 'react-test-renderer';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { InsightCard } from '@/components/InsightCard';
import { appLightTheme } from '@/theme';
import type { InsightMatch } from '@/lib/insights/InsightEngine';

const baseInsight: InsightMatch = {
  id: 'test-insight',
  priority: 4,
  message: 'Short sleep can dampen serotonin pathways and mood balance.',
  action: 'Take a 10–20 min sunlight walk.',
  sourceTag: 'sleep_serotonin',
  matchedConditions: [
    { field: 'mood.last', op: 'lt', value: 3 },
    { field: 'sleep.lastNight.hours', op: 'lt', value: 6 },
  ],
};

describe('InsightCard snapshots', () => {
  const renderWithProviders = (theme: any) => {
    const qc = new QueryClient();
    return renderer.create(
      <QueryClientProvider client={qc}>
        <PaperProvider theme={theme}>
          <InsightCard insight={baseInsight} />
        </PaperProvider>
      </QueryClientProvider>,
    );
  };

  it('matches snapshot in light theme', () => {
    const tree = renderWithProviders(appLightTheme).toJSON();

    expect(tree).toMatchSnapshot();
  });

  it('matches snapshot in dark theme', () => {
    const darkTheme = {
      ...appLightTheme,
      dark: true,
      colors: {
        ...appLightTheme.colors,
        surface: '#1b1b1f',
        onSurfaceVariant: '#c8c5d0',
        secondaryContainer: '#3b2f5d',
        onSecondaryContainer: '#e5ddff',
      },
    };

    const tree = renderWithProviders(darkTheme).toJSON();

    expect(tree).toMatchSnapshot();
  });
});

