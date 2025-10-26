import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMeditations,
  upsertMeditation,
  deleteMeditation,
  createMeditationStart,
  finishMeditation,
  type MeditationSession,
} from "@/lib/api";

function fmtHMS(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

export default function MeditationScreen() {
  const qc = useQueryClient();

  const { data: sessions } = useQuery({
    queryKey: ["meditations"],
    queryFn: listMeditations,
  });

  // active session state (not yet persisted as "finished")
  const [active, setActive] = useState<MeditationSession | null>(null);
  const [note, setNote] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<NodeJS.Timer | null>(null);

  // mutations
  const saveMutation = useMutation({
    mutationFn: upsertMeditation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meditations"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMeditation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meditations"] }),
  });

  // timer effect
  useEffect(() => {
    if (!active) return;
    const start = new Date(active.startTime).getTime();
    tickRef.current = setInterval(() => setElapsed(Math.max(0, Math.round((Date.now() - start) / 1000))), 250);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [active?.id]);

  const onStart = () => {
    if (active) return;
    const s = createMeditationStart(note?.trim() ? note : undefined);
    setActive(s);
    setElapsed(0);
  };

  const onStop = async () => {
    if (!active) return;
    const finished = finishMeditation(active);
    await saveMutation.mutateAsync(finished);
    setActive(null);
    setNote("");
    setElapsed(0);
  };

  const onSaveNoteToSelected = async (s: MeditationSession, newNote: string) => {
    await saveMutation.mutateAsync({ ...s, note: newNote });
  };

  const ListItem = ({ item }: { item: MeditationSession }) => {
    const dur = item.durationSec ?? (item.endTime ? Math.max(0, Math.round((+new Date(item.endTime) - +new Date(item.startTime)) / 1000)) : 0);
    return (
      <View className="p-3 mb-2 rounded-2xl border border-gray-300">
        <Text className="text-lg font-semibold">
          {new Date(item.startTime).toLocaleString()}
        </Text>
        <Text className="mt-1">
          {item.endTime ? `Duration: ${fmtHMS(dur)}` : "In progress"}
        </Text>
        {item.note ? <Text className="mt-1 opacity-80">Note: {item.note}</Text> : null}
        <View className="flex-row gap-3 mt-2">
          <TouchableOpacity
            className="px-3 py-2 rounded-xl border border-gray-400"
            onPress={() => {
              Alert.prompt?.(
                "Edit Note",
                "",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Save",
                    onPress: (val) => onSaveNoteToSelected(item, (val ?? "").trim()),
                  },
                ],
                "plain-text",
                item.note ?? ""
              ) ?? Alert.alert("Edit Note", "Prompt not supported on this platform.");
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

  const headerDur = useMemo(() => (active ? fmtHMS(elapsed) : "00:00:00"), [active, elapsed]);

  return (
    <View className="flex-1 p-4">
      {/* Active timer card */}
      <View className="p-4 rounded-2xl border border-gray-300 mb-4">
        <Text className="text-xl font-bold">Meditation</Text>
        <Text className="text-3xl mt-2">{headerDur}</Text>

        {/* Note input (applies to the run you are about to start; you can edit later) */}
        {!active && (
          <TextInput
            className="mt-3 p-3 rounded-xl border border-gray-300"
            placeholder="Optional note for this session..."
            value={note}
            onChangeText={setNote}
            multiline
          />
        )}

        <View className="flex-row gap-3 mt-3">
          {!active ? (
            <TouchableOpacity className="px-4 py-3 rounded-2xl bg-black" onPress={onStart}>
              <Text className="text-white font-semibold">Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="px-4 py-3 rounded-2xl bg-black" onPress={onStop}>
              <Text className="text-white font-semibold">Stop & Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* History */}
      <Text className="text-lg font-semibold mb-2">History</Text>
      <FlatList
        data={sessions ?? []}
        keyExtractor={(it) => it.id}
        renderItem={ListItem}
        ListEmptyComponent={<Text className="opacity-60">No sessions yet.</Text>}
        contentContainerStyle={{ paddingBottom: 120 }}
      />
    </View>
  );
}
