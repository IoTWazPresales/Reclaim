// C:\Reclaim\app\src\screens\MeditationScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Alert, Modal, ScrollView } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { useRoute } from '@react-navigation/native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';

import {
  listMeditations,
  upsertMeditation,
  deleteMeditation,
  createMeditationStart,
  finishMeditation,
  type MeditationSession,
} from '@/lib/api';
import {
  MEDITATION_CATALOG,
  getMeditationById,
  type MeditationType,
  type MeditationScriptStep,
} from '@/lib/meditations';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SectionHeader } from '@/components/ui';

const ACTIVE_KEY = '@reclaim/meditations/active';
import AsyncStorage from '@react-native-async-storage/async-storage';

function fmtHMS(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

type Params = { type?: MeditationType; autoStart?: boolean; note?: string };

export default function MeditationScreen() {
  const qc = useQueryClient();
  const route = useRoute();
  const params = (route.params ?? {}) as Params;
  const reduceMotion = useReducedMotion();
  const theme = useTheme();

  const { data: sessions } = useQuery({
    queryKey: ['meditations'],
    queryFn: listMeditations,
  });

  const [selectedType, setSelectedType] = useState<MeditationType | undefined>(params.type);
  const selectedScript = selectedType ? getMeditationById(selectedType) : undefined;

  const [active, setActive] = useState<MeditationSession | null>(null);
  const [note, setNote] = useState(params.note ?? "");
  const [elapsed, setElapsed] = useState(0);

  // ✅ Fix: use ReturnType<typeof setInterval> for RN timers
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // guided steps
  const [showGuide, setShowGuide] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const currentStep: MeditationScriptStep | undefined = selectedScript?.steps?.[stepIdx];

  // mutations
  const saveMutation = useMutation({
    mutationFn: upsertMeditation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meditations'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMeditation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meditations'] }),
  });

  // resume active across reload
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(ACTIVE_KEY);
      if (raw) setActive(JSON.parse(raw));
    })();
  }, []);
  useEffect(() => {
    if (active) AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
    else AsyncStorage.removeItem(ACTIVE_KEY);
  }, [active?.id]);

  // timer effect
  useEffect(() => {
    if (!active) return;
    const start = new Date(active.startTime).getTime();

    tickRef.current = setInterval(() => {
      setElapsed(Math.max(0, Math.round((Date.now() - start) / 1000)));
    }, 250);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null; // ✅ clear ref to avoid mismatched handle types
      }
    };
  }, [active?.id]);

  // Auto-start via deep link
  useEffect(() => {
    if (params.autoStart && selectedScript && !active) {
      onStart(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.autoStart, selectedScript?.id]);

  const onStart = (fromDeeplink = false) => {
    if (!selectedType) {
      Alert.alert('Select a meditation type first.');
      return;
    }
    if (active) return;
    const s = createMeditationStart(note?.trim() ? note : undefined, selectedType);
    setActive(s);
    setElapsed(0);
    // optional: open guide automatically unless starting from deep link
    setShowGuide(!fromDeeplink);
    setStepIdx(0);
  };

  const onStop = async () => {
    if (!active) return;

    // ✅ also clear interval here in case user stops while effect is mounted
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    const finished = finishMeditation(active);
    await saveMutation.mutateAsync(finished);
    
    // Sync meditation session to Supabase meditation_sessions table
    try {
      const { syncAll } = await import('@/lib/sync');
      await syncAll();
    } catch (syncError) {
      // Log but don't fail if sync fails
      console.warn('Failed to sync meditation session:', syncError);
    }
    
    setActive(null);
    setNote('');
    setElapsed(0);
    setShowGuide(false);
    setStepIdx(0);
  };

  const onSaveNoteToSelected = async (s: MeditationSession, newNote: string) => {
    await saveMutation.mutateAsync({ ...s, note: newNote });
  };

  const sectionSpacing = 16;
  const cardRadius = 16;
  const cardSurface = theme.colors.surface;

  const ListItem = ({ item }: { item: MeditationSession }) => {
    const dur =
      item.durationSec ??
      (item.endTime ? Math.max(0, Math.round((+new Date(item.endTime) - +new Date(item.startTime)) / 1000)) : 0);
    const typeName = item.meditationType ? getMeditationById(item.meditationType)?.name ?? item.meditationType : 'Meditation';
    return (
      <Card
        mode="outlined"
        style={{ borderRadius: cardRadius, marginBottom: 12, backgroundColor: cardSurface }}
      >
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {typeName}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {new Date(item.startTime).toLocaleString()}
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurface }}>
            {item.endTime ? `Duration: ${fmtHMS(dur)}` : 'In progress'}
          </Text>
          {item.note ? (
            <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
              Note: {item.note}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', columnGap: 8, marginTop: 12 }}>
            <Button
              mode="outlined"
              onPress={() => setEditing({ id: item.id, note: item.note ?? '' })}
            >
              Edit note
            </Button>
            <Button
              mode="text"
              textColor={theme.colors.error}
              onPress={() =>
                Alert.alert('Delete session?', 'This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                ])
              }
            >
              Delete
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // simple cross-platform edit note modal
  const [editing, setEditing] = useState<{ id: string; note: string } | null>(null);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}
      keyboardShouldPersistTaps="handled"
    >
      {!active && (
        <View style={{ marginBottom: sectionSpacing }}>
          <SectionHeader title="Meditation" icon="meditation" />
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                Select practice
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  borderRadius: 12,
                  marginTop: 12,
                  overflow: 'hidden',
                }}
              >
                <Picker selectedValue={selectedType} onValueChange={(v) => setSelectedType(v)}>
                  <Picker.Item label="Select..." value={undefined} />
                  {MEDITATION_CATALOG.map((m) => (
                    <Picker.Item key={m.id} label={`${m.name} (${m.estMinutes}m)`} value={m.id} />
                  ))}
                </Picker>
              </View>

              <TextInput
                mode="outlined"
                label="Optional note"
                placeholder="Anything you'd like to focus on..."
                value={note}
                onChangeText={setNote}
                multiline
                style={{ marginTop: 16 }}
              />

              {selectedScript ? (
                <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                  {selectedScript.estMinutes} min · {selectedScript.steps.length} steps
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', marginTop: 16 }}>
                <Button mode="contained" onPress={() => onStart(false)}>
                  Start
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      )}

      {active && (
        <View style={{ marginBottom: sectionSpacing }}>
          <SectionHeader title="Active session" icon="timer-outline" />
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <Text variant="headlineLarge" style={{ color: theme.colors.onSurface }}>
                {fmtHMS(elapsed)}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {active.meditationType ? getMeditationById(active.meditationType)?.name : 'Meditation'}
              </Text>
              <View style={{ flexDirection: 'row', columnGap: 12, marginTop: 16 }}>
                <Button mode="contained" onPress={onStop}>
                  Stop & save
                </Button>
                {selectedScript ? (
                  <Button mode="outlined" onPress={() => setShowGuide(true)}>
                    Open guide
                  </Button>
                ) : null}
              </View>
            </Card.Content>
          </Card>
        </View>
      )}

      <View style={{ marginBottom: sectionSpacing }}>
        <SectionHeader title="History" icon="history" />
        {sessions?.length ? (
          sessions.map((session) => <ListItem key={session.id} item={session} />)
        ) : (
          <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No sessions yet.
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Guided steps modal */}
      <Modal
        visible={showGuide}
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setShowGuide(false)}
        transparent
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: cardSurface, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              {selectedScript?.name}
            </Text>
            <Text variant="titleMedium" style={{ marginTop: 12, color: theme.colors.onSurface }}>
              {currentStep?.title}
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
              {currentStep?.instruction}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <Button mode="outlined" disabled={stepIdx === 0} onPress={() => setStepIdx(Math.max(0, stepIdx - 1))}>
                Back
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  if (!selectedScript) return;
                  if (stepIdx < selectedScript.steps.length - 1) setStepIdx(stepIdx + 1);
                  else setShowGuide(false);
                }}
              >
                {selectedScript && stepIdx < selectedScript.steps.length - 1 ? 'Next' : 'Done'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!editing}
        transparent
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setEditing(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <Card style={{ borderRadius: 20, backgroundColor: cardSurface }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 12 }}>
                Edit note
              </Text>
              <TextInput
                mode="outlined"
                value={editing?.note ?? ''}
                onChangeText={(t) => setEditing((ed) => (ed ? { ...ed, note: t } : ed))}
                multiline
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', columnGap: 12, marginTop: 16 }}>
                <Button mode="text" onPress={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={async () => {
                    const row = sessions?.find((s) => s.id === editing?.id);
                    if (row) await onSaveNoteToSelected(row, editing!.note);
                    setEditing(null);
                  }}
                >
                  Save
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}
