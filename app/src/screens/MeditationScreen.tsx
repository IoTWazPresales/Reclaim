// C:\Reclaim\app\src\screens\MeditationScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, Alert, Modal } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Picker } from "@react-native-picker/picker";
import { useRoute } from "@react-navigation/native";

import {
  listMeditations,
  upsertMeditation,
  deleteMeditation,
  createMeditationStart,
  finishMeditation,
  type MeditationSession,
} from "@/lib/api";
import {
  MEDITATION_CATALOG,
  getMeditationById,
  type MeditationType,
  type MeditationScriptStep
} from "@/lib/meditations";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ACTIVE_KEY = "@reclaim/meditations/active";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  const { data: sessions } = useQuery({
    queryKey: ["meditations"],
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meditations"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMeditation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meditations"] }),
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
      Alert.alert("Select a meditation type first.");
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
    setNote("");
    setElapsed(0);
    setShowGuide(false);
    setStepIdx(0);
  };

  const onSaveNoteToSelected = async (s: MeditationSession, newNote: string) => {
    await saveMutation.mutateAsync({ ...s, note: newNote });
  };

  const ListItem = ({ item }: { item: MeditationSession }) => {
    const dur = item.durationSec ?? (item.endTime ? Math.max(0, Math.round((+new Date(item.endTime) - +new Date(item.startTime)) / 1000)) : 0);
    const typeName = item.meditationType ? (getMeditationById(item.meditationType)?.name ?? item.meditationType) : "Meditation";
    return (
      <View className="p-3 mb-2 rounded-2xl border border-gray-300">
        <Text className="text-lg font-semibold">{typeName}</Text>
        <Text className="opacity-70">{new Date(item.startTime).toLocaleString()}</Text>
        <Text className="mt-1">{item.endTime ? `Duration: ${fmtHMS(dur)}` : "In progress"}</Text>
        {item.note ? <Text className="mt-1 opacity-80">Note: {item.note}</Text> : null}
        <View className="flex-row gap-3 mt-2">
          <TouchableOpacity
            className="px-3 py-2 rounded-xl border border-gray-400"
            onPress={() => {
              setEditing({ id: item.id, note: item.note ?? "" });
            }}
          >
            <Text>Edit Note</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="px-3 py-2 rounded-xl border border-red-400"
            onPress={() =>
              Alert.alert("Delete session?", "This cannot be undone.", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
              ])
            }
          >
            <Text className="text-red-600">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // simple cross-platform edit note modal
  const [editing, setEditing] = useState<{ id: string; note: string } | null>(null);

  return (
    <View className="flex-1 p-4">
      {/* Type + Note */}
      {!active && (
        <View className="p-4 rounded-2xl border border-gray-300 mb-4">
          <Text className="text-xl font-bold">Meditation</Text>

          <Text className="mt-3 mb-1 font-semibold">Type</Text>
          <Picker selectedValue={selectedType} onValueChange={(v) => setSelectedType(v)}>
            <Picker.Item label="Select..." value={undefined} />
            {MEDITATION_CATALOG.map(m => (
              <Picker.Item key={m.id} label={`${m.name} (${m.estMinutes}m)`} value={m.id} />
            ))}
          </Picker>

          <TextInput
            className="mt-3 p-3 rounded-xl border border-gray-300"
            placeholder="Optional note..."
            value={note}
            onChangeText={setNote}
            multiline
          />

          {selectedScript ? (
            <Text className="mt-2 opacity-70">{selectedScript.estMinutes} min · {selectedScript.steps.length} steps</Text>
          ) : null}

          <View className="flex-row gap-3 mt-3">
            <TouchableOpacity className="px-4 py-3 rounded-2xl bg-black" onPress={() => onStart(false)}>
              <Text className="text-white font-semibold">Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Active timer card */}
      {active && (
        <View className="p-4 rounded-2xl border border-gray-300 mb-4">
          <Text className="text-3xl font-bold">{fmtHMS(elapsed)}</Text>
          <Text className="mt-1 opacity-70">{active.meditationType ? getMeditationById(active.meditationType)?.name : "Meditation"}</Text>

          <View className="flex-row gap-3 mt-3">
            <TouchableOpacity className="px-4 py-3 rounded-2xl bg-black" onPress={onStop}>
              <Text className="text-white font-semibold">Stop & Save</Text>
            </TouchableOpacity>
            {selectedScript && (
              <TouchableOpacity className="px-4 py-3 rounded-2xl border border-gray-400" onPress={() => setShowGuide(true)}>
                <Text>Open Guide</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* History */}
      <Text className="text-lg font-semibold mb-2">History</Text>
      <FlatList
        data={sessions ?? []}
        keyExtractor={(it) => it.id}
        renderItem={ListItem}
        ListEmptyComponent={<Text className="opacity-60">No sessions yet.</Text>}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Guided steps modal */}
      <Modal
        visible={showGuide}
        animationType={reduceMotion ? "none" : "slide"}
        onRequestClose={() => setShowGuide(false)}
        transparent
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white p-4 rounded-t-3xl">
            <Text className="text-xl font-bold">{selectedScript?.name}</Text>
            <Text className="mt-2 font-semibold">{currentStep?.title}</Text>
            <Text className="mt-1 opacity-80">{currentStep?.instruction}</Text>

            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                className="px-4 py-3 rounded-2xl border border-gray-400"
                disabled={stepIdx === 0}
                onPress={() => setStepIdx(Math.max(0, stepIdx - 1))}
              >
                <Text>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-3 rounded-2xl bg-black"
                onPress={() => {
                  if (!selectedScript) return;
                  if (stepIdx < selectedScript.steps.length - 1) setStepIdx(stepIdx + 1);
                  else setShowGuide(false);
                }}
              >
                <Text className="text-white font-semibold">{selectedScript && stepIdx < selectedScript.steps.length - 1 ? "Next" : "Done"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit note modal */}
      <Modal
        visible={!!editing}
        transparent
        animationType={reduceMotion ? "none" : "fade"}
        onRequestClose={() => setEditing(null)}
      >
        <View className="flex-1 bg-black/50 justify-center p-6">
          <View className="bg-white rounded-2xl p-4">
            <Text className="text-lg font-semibold mb-2">Edit Note</Text>
            <TextInput
              className="p-3 rounded-xl border border-gray-300"
              value={editing?.note ?? ""}
              onChangeText={(t) => setEditing(ed => ed ? { ...ed, note: t } : ed)}
              multiline
            />
            <View className="flex-row justify-end gap-3 mt-3">
              <TouchableOpacity className="px-4 py-3 rounded-2xl border border-gray-400" onPress={() => setEditing(null)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-3 rounded-2xl bg-black"
                onPress={async () => {
                  const row = sessions?.find(s => s.id === editing?.id);
                  if (row) await onSaveNoteToSelected(row, editing!.note);
                  setEditing(null);
                }}
              >
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
