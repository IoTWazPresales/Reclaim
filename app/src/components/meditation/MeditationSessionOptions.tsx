import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Portal, Dialog, RadioButton, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

type VoicePref = { voiceId: string | null };

type Props = {
  note: string;
  onNoteChange: (t: string) => void;
  voiceOn: boolean;
  onVoiceOnChange: (v: boolean) => void;
  autoAdvanceOn: boolean;
  onAutoAdvanceChange: (v: boolean) => void;
  voices: Speech.Voice[];
  voicePref: VoicePref;
  onVoicePrefChange: (pref: VoicePref) => void;
};

export function MeditationSessionOptions({
  note,
  onNoteChange,
  voiceOn,
  onVoiceOnChange,
  autoAdvanceOn,
  onAutoAdvanceChange,
  voices,
  voicePref,
  onVoicePrefChange,
}: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const pickerBg = theme.colors.surfaceVariant;

  const enVoices = voices.filter((v) => (v.language ?? '').toLowerCase().startsWith('en'));
  const displayVoices = enVoices.length > 0 ? enVoices : voices;
  const selectedVoice = voicePref.voiceId
    ? displayVoices.find((v) => v.identifier === voicePref.voiceId)
    : null;

  return (
    <View style={{ marginTop: 14 }}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text variant="labelLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', flex: 1 }}>
          Session options {expanded ? '▾' : '▸'}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={{ marginTop: 10, gap: 10 }}>
          <TextInput
            mode="outlined"
            label="Optional note"
            placeholder="Anything you'd like to focus on…"
            value={note}
            onChangeText={onNoteChange}
            multiline
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Voice guidance</Text>
            <Switch value={voiceOn} onValueChange={onVoiceOnChange} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Auto-advance</Text>
            <Switch value={autoAdvanceOn} onValueChange={onAutoAdvanceChange} />
          </View>
          <Pressable
            onPress={() => setVoicePickerOpen(true)}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: pickerBg,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.colors.onSurface, flex: 1 }} numberOfLines={1}>
              Voice: {selectedVoice ? selectedVoice.name : 'Auto (recommended)'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
          </Pressable>
          <Portal>
            <Dialog visible={voicePickerOpen} onDismiss={() => setVoicePickerOpen(false)} style={{ maxHeight: '70%' }}>
              <Dialog.Title>Select voice</Dialog.Title>
              <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
                <ScrollView>
                  <RadioButton.Group
                    value={voicePref.voiceId ?? 'auto'}
                    onValueChange={(v) => {
                      onVoicePrefChange({ voiceId: v === 'auto' ? null : v });
                      setVoicePickerOpen(false);
                    }}
                  >
                    <RadioButton.Item label="Auto (recommended)" value="auto" />
                    {displayVoices.map((v) => (
                      <RadioButton.Item key={v.identifier} label={`${v.name} (${v.language})`} value={v.identifier} />
                    ))}
                  </RadioButton.Group>
                </ScrollView>
              </Dialog.ScrollArea>
              <Dialog.Actions>
                <Button onPress={() => setVoicePickerOpen(false)}>Cancel</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </View>
      ) : null}
    </View>
  );
}
