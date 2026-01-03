import React from 'react';
import { vi, describe, expect, it } from 'vitest';

vi.mock('react-native', () => {
  const React = require('react');
  const createComponent =
    (tag: string) =>
    ({ children, ...props }: any) =>
      React.createElement(tag, props, children);

  return {
    StyleSheet: {
      create: (styles: unknown) => styles,
    },
    View: createComponent('div'),
    Text: createComponent('span'),
  };
});

vi.mock('react-native-paper', () => {
  const React = require('react');
  const ThemeContext = React.createContext({
    colors: {
      primary: '#2563eb',
      secondary: '#2563eb',
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
  const Chip = createComponent('span');
  const Text = createComponent('span');

  const baseTheme = {
    colors: {
      primary: '#2563eb',
      secondary: '#2563eb',
      surface: '#ffffff',
      secondaryContainer: '#e0def5',
      onSecondaryContainer: '#23104a',
      onSurfaceVariant: '#4a4a4a',
    },
    dark: false,
  };

  return {
    PaperProvider,
    useTheme,
    Card,
    Button,
    Chip,
    Text,
    MD3LightTheme: baseTheme,
  };
});

vi.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));
import renderer from 'react-test-renderer';
import { PaperProvider } from 'react-native-paper';

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
    { field: 'mood.last', operator: 'lt', value: 3 },
    { field: 'sleep.lastNight.hours', operator: 'lt', value: 6 },
  ],
};

describe('InsightCard snapshots', () => {
  it('matches snapshot in light theme', () => {
    const tree = renderer
      .create(
        <PaperProvider theme={appLightTheme}>
          <InsightCard insight={baseInsight} />
        </PaperProvider>,
      )
      .toJSON();

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

    const tree = renderer
      .create(
        <PaperProvider theme={darkTheme}>
          <InsightCard insight={baseInsight} />
        </PaperProvider>,
      )
      .toJSON();

    expect(tree).toMatchSnapshot();
  });
});

