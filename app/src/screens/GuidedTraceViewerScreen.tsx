// C:\Reclaim\app\src\screens\GuidedTraceViewerScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import {
  Button,
  Card,
  Divider,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';

import {
  clearGuidedTraceEvents,
  formatGuidedTracesForExport,
  getGuidedTraceEvents,
  hydrateGuidedTraceCaptureFromStorage,
} from '@/lib/training/guidedTraceCapture';
import type {
  GuidedTraceAction,
  GuidedTracePayload,
  GuidedTraceSource,
} from '@/lib/training/guidedTransitionTrace';
import { useAppTheme } from '@/theme';
import { reclaimSectionCardShell } from '@/theme/reclaimVisualLanguage';
import type { DrawerParamList } from '@/navigation/types';

const QA_STEPS = [
  'Install this development APK on your Android phone.',
  'Start a guided training session with notifications enabled.',
  'Complete set 1 from the in-app UI.',
  'Background or lock the phone.',
  'Tap Done on the Wear OS notification (or use phone notification SET_DONE in a second pass).',
  'Open the app again and verify no duplicate Done prompt, set index did not move backward, and rest/next state looks correct.',
  'Open Guided Trace Viewer, copy or share the export, and send it for debugging.',
];

export default function GuidedTraceViewerScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const sectionShell = useMemo(() => reclaimSectionCardShell(appTheme), [appTheme]);
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();

  const [events, setEvents] = useState(() => getGuidedTraceEvents());
  const [sourceFilter, setSourceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const refresh = useCallback(async () => {
    await hydrateGuidedTraceCaptureFromStorage();
    setEvents(getGuidedTraceEvents());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    let list = events.slice().reverse();
    const sf = sourceFilter.trim().toLowerCase();
    const af = actionFilter.trim().toUpperCase();
    if (sf) {
      list = list.filter((e) =>
        (e.source as GuidedTraceSource).toLowerCase().includes(sf),
      );
    }
    if (af) {
      list = list.filter((e) =>
        (e.action as GuidedTraceAction).toUpperCase().includes(af),
      );
    }
    return list;
  }, [events, sourceFilter, actionFilter]);

  const exportPayload = useMemo(() => {
    const hasFilters = !!(sourceFilter.trim() || actionFilter.trim());
    let chronological: GuidedTracePayload[];
    if (hasFilters) {
      chronological = filtered.slice().reverse();
    } else {
      chronological = events.slice();
    }
    return formatGuidedTracesForExport(chronological);
  }, [events, filtered, sourceFilter, actionFilter]);

  const onShare = async () => {
    try {
      await Share.share({
        title: 'Guided trace export',
        message: exportPayload,
      });
    } catch (e: unknown) {
      Alert.alert('Share failed', String((e as Error)?.message ?? e ?? 'Unknown error'));
    }
  };

  const onClear = () => {
    Alert.alert(
      'Clear guided traces?',
      'This removes the in-memory buffer and persisted dev trace file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await clearGuidedTraceEvents();
              setEvents([]);
            })();
          },
        },
      ],
    );
  };

  if (!__DEV__) {
    return (
      <View style={{ flex: 1, padding: 20, backgroundColor: theme.colors.background }}>
        <Text>Guided Trace Viewer is only available in development builds.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 16 }}>
        <Text variant="headlineMedium" style={{ marginBottom: 8, fontWeight: '700' }}>
          Guided trace viewer
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
          DEV-only. Captures recent [GUIDED_TRACE] rows (IDs and state only). Use Share to send JSON for
          debugging.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <Button mode="contained-tonal" compact onPress={() => void refresh()}>
            Refresh
          </Button>
          <Button mode="contained-tonal" compact onPress={() => void onShare()}>
            Share export
          </Button>
          <Button mode="outlined" compact onPress={onClear}>
            Clear
          </Button>
          <Button mode="text" compact onPress={() => navigation.navigate('Diagnostics')}>
            Diagnostics
          </Button>
        </View>

        <Card mode="outlined" style={[sectionShell as object, { marginBottom: 16 }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: '700' }}>
              Filters
            </Text>
            <TextInput
              label="Source contains"
              value={sourceFilter}
              onChangeText={setSourceFilter}
              mode="outlined"
              dense
              style={{ marginBottom: 8 }}
            />
            <TextInput
              label="Action contains"
              value={actionFilter}
              onChangeText={setActionFilter}
              mode="outlined"
              dense
            />
            <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
              Total captured: {events.length} · Shown: {filtered.length}
            </Text>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[sectionShell as object, { marginBottom: 16 }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: '700' }}>
              Recent events (newest first)
            </Text>
            {filtered.slice(0, 80).map((row, idx) => (
              <View key={`${row.ts}-${idx}`} style={{ marginBottom: 10 }}>
                <Text variant="bodySmall" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {row.ts} · {row.source} · {row.action}
                </Text>
                <Text variant="bodySmall" style={{ fontFamily: 'monospace', fontSize: 10, opacity: 0.85 }}>
                  {JSON.stringify(row)}
                </Text>
                {idx < Math.min(filtered.length, 80) - 1 ? <Divider style={{ marginTop: 8 }} /> : null}
              </View>
            ))}
            {filtered.length > 80 ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                Showing first 80 of {filtered.length}. Use Share export for the full list.
              </Text>
            ) : null}
            {filtered.length === 0 ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                No trace rows yet. Complete a guided session with notifications, then tap Refresh.
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[sectionShell as object, { marginBottom: 16 }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: '700' }}>
              Raw JSON (select & copy)
            </Text>
            <Text selectable variant="bodySmall" style={{ fontFamily: 'monospace', fontSize: 10 }}>
              {exportPayload}
            </Text>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[sectionShell as object, { marginBottom: 16 }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: '700' }}>
              Manual QA checklist
            </Text>
            {QA_STEPS.map((line, i) => (
              <Text key={i} variant="bodySmall" style={{ marginBottom: 6 }}>
                {i + 1}. {line}
              </Text>
            ))}
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}
