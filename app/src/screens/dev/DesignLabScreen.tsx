/**
 * __DEV__ Design Lab — N-0030 high-fidelity candidates.
 * Picker is lab chrome. Immersive mocks are product UI (no meta copy).
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { PaperProvider, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appDarkTheme } from '@/theme/appThemes';
import { LUMEN } from './designLab/labTokens';
import {
  LumenDay,
  LumenDrawer,
  LumenGraphs,
  LumenSession,
  LumenToday,
  LumenTraining,
  ProductChrome,
  PulseToday,
} from './designLab/LumenMocks';

type Surface =
  | 'picker'
  | 'lumen-today'
  | 'lumen-day'
  | 'lumen-training'
  | 'lumen-session'
  | 'lumen-graphs'
  | 'lumen-drawer'
  | 'pulse-today'
  | 'pulse-graphs';

const PICKS: { id: Surface; label: string; sub: string }[] = [
  { id: 'lumen-today', label: 'Lumen · Today', sub: 'Brain + day rail + week + start' },
  { id: 'lumen-day', label: 'Lumen · Day map', sub: 'Schedule as duration blocks' },
  { id: 'lumen-training', label: 'Lumen · Training', sub: 'Volume week + bar-path card' },
  { id: 'lumen-session', label: 'Lumen · Session', sub: 'Diagram + numerals, not an essay' },
  { id: 'lumen-graphs', label: 'Lumen · Graphs', sub: '28-day overlay, hypnogram, mood' },
  { id: 'lumen-drawer', label: 'Lumen · Menu', sub: 'Hamburger destinations' },
  { id: 'pulse-today', label: 'Pulse · Today', sub: 'Instruments first, no constellation' },
  { id: 'pulse-graphs', label: 'Pulse · Graphs', sub: 'Same charts, denser stack' },
];

function Inner() {
  const insets = useSafeAreaInsets();
  const [surface, setSurface] = useState<Surface>('picker');
  const back = () => setSurface('picker');

  if (surface === 'picker') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: LUMEN.page }}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <Text style={{ color: LUMEN.muted, fontSize: 12 }}>N-0030 · design lab · not the product</Text>
        <Text style={{ color: LUMEN.text, fontSize: 28, fontWeight: '800', marginTop: 8, marginBottom: 16 }}>
          Two candidates
        </Text>
        {PICKS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setSurface(p.id)}
            accessibilityRole="button"
            accessibilityLabel={p.label}
            style={{
              minHeight: 56,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: LUMEN.line,
              backgroundColor: LUMEN.surface,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: LUMEN.teal, fontWeight: '700' }}>{p.label}</Text>
            <Text style={{ color: LUMEN.muted, marginTop: 4 }}>{p.sub}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  if (surface === 'lumen-drawer') {
    return <LumenDrawer onClose={() => setSurface('lumen-today')} />;
  }

  const tab = surface.includes('graphs') ? 'analytics' : 'home';
  const title =
    surface === 'lumen-training' || surface === 'lumen-session'
      ? 'Training'
      : surface.includes('graphs')
        ? 'Analytics'
        : surface === 'lumen-day'
          ? 'Today'
          : 'Home';

  let body: React.ReactNode = <LumenToday />;
  if (surface === 'lumen-day') body = <LumenDay />;
  if (surface === 'lumen-training') body = <LumenTraining />;
  if (surface === 'lumen-session') body = <LumenSession />;
  if (surface === 'lumen-graphs' || surface === 'pulse-graphs') body = <LumenGraphs />;
  if (surface === 'pulse-today') body = <PulseToday />;

  return (
    <ProductChrome
      title={title}
      tab={tab}
      onMenu={() => setSurface('lumen-drawer')}
      onLabExit={back}
      onTab={(t) => {
        if (t === 'analytics') setSurface(surface.startsWith('pulse') ? 'pulse-graphs' : 'lumen-graphs');
        if (t === 'home') setSurface(surface.startsWith('pulse') ? 'pulse-today' : 'lumen-today');
      }}
    >
      {body}
    </ProductChrome>
  );
}

export default function DesignLabScreen() {
  return (
    <PaperProvider theme={appDarkTheme}>
      <Inner />
    </PaperProvider>
  );
}
