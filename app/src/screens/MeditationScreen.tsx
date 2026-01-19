// C:\Reclaim\app\src\screens\MeditationScreen.tsx

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Alert, Modal, ScrollView, AppState, AppStateStatus } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { useRoute } from '@react-navigation/native';
import { Button, Card, Divider, Text, TextInput, useTheme, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

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

import {
  getDefaultMeditationSource,
  setDefaultMeditationSource,
  labelForSource,
  type MeditationSource,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deserializeMeditationSource,
} from '@/lib/meditationSources';

import { MeditationLibraryModal } from '@/components/meditation/MeditationLibraryModal';
import { ExternalMediaModal } from '@/components/meditation/ExternalMediaModal';

import { navigateToHome, navigateToSleep } from '@/navigation/nav';

const ACTIVE_KEY = '@reclaim/meditations/active';
const VOICE_PREF_KEY = '@reclaim/meditations/voice_pref';

function fmtHMS(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// Deep link:
// - old: reclaim://meditation?type=...&autoStart=true
// - new: reclaim://meditation?source=...&autoStart=true
type Params = {
  type?: MeditationType;
  source?: string;
  autoStart?: boolean | 'true' | 'false' | string;
  note?: string;
};

type ScriptMaybeAudio = {
  id: MeditationType;
  name: string;
  estMinutes: number;
  steps: MeditationScriptStep[];
  audioUrl?: string;
};

type VoicePref = {
  voiceId: string | null; // null = Auto
};

/** -----------------------------
 * Type guards for MeditationSource
 * ------------------------------ */
type ScriptSource = Extract<MeditationSource, { kind: 'script' }>;
type BuiltInSource = Extract<MeditationSource, { kind: 'built_in' }>;
type ExternalSource = Extract<MeditationSource, { kind: 'external' }>;
type AudioSource = Extract<MeditationSource, { kind: 'audio' }>;

function isScriptSource(s: MeditationSource): s is ScriptSource {
  return (s as any)?.kind === 'script';
}
function isBuiltInSource(s: MeditationSource): s is BuiltInSource {
  return (s as any)?.kind === 'built_in';
}
function isExternalSource(s: MeditationSource): s is ExternalSource {
  return (s as any)?.kind === 'external';
}
function isAudioSource(s: MeditationSource): s is AudioSource {
  return (s as any)?.kind === 'audio';
}

function truthyParam(v: any): boolean {
  if (v === true) return true;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1' || v.toLowerCase() === 'yes';
  if (typeof v === 'number') return v === 1;
  return false;
}

export default function MeditationScreen() {
  const qc = useQueryClient();
  const route = useRoute();
  const params = (route.params ?? {}) as Params;
  const reduceMotion = useReducedMotion();
  const theme = useTheme();

  const autoStart = truthyParam(params.autoStart);

  const cardRadius = 16;
  const cardSurface = theme.colors.surface;
  const sectionSpacing = 16;

  const { data: sessions } = useQuery({
    queryKey: ['meditations'],
    queryFn: listMeditations,
  });

  // Selected built-in meditation
  const [selectedType, setSelectedType] = useState<MeditationType | undefined>(params.type);

  const selectedScript = useMemo(() => {
    const s = selectedType ? (getMeditationById(selectedType) as any) : undefined;
    return s as ScriptMaybeAudio | undefined;
  }, [selectedType]);

  // Default meditation source (used by auto-meditation triggers)
  const [defaultSource, setDefaultSourceState] = useState<MeditationSource | null>(null);

  // Library + external playback
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [externalOpen, setExternalOpen] = useState(false);
  const [externalTitle, setExternalTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  // Active session tracking
  const [active, setActive] = useState<MeditationSession | null>(null);
  const [note, setNote] = useState(params.note ?? '');
  const [elapsed, setElapsed] = useState(0);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guide modal (script)
  const [showGuide, setShowGuide] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const currentStep: MeditationScriptStep | undefined = selectedScript?.steps?.[stepIdx];

  // Voice controls
  const [voiceOn, setVoiceOn] = useState(true);
  const [autoAdvanceOn, setAutoAdvanceOn] = useState(true);

  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [voicePref, setVoicePref] = useState<VoicePref>({ voiceId: null });

  // Audio playback (audioUrl meditations)
  const soundRef = useRef<Audio.Sound | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  /**
   * ✅ Auto-advance tuning
   * - MIN_STEP_MS enforces a floor so it never feels “machine gun fast”
   * - AFTER_SPEECH_PAUSE_MS adds a breath after the voice stops
   * - END_HOLD_MS holds the final step before auto-finishing
   */
  const MIN_STEP_MS = 12000;            // 12s minimum per step
  const AFTER_SPEECH_PAUSE_MS = 4500;   // pause after speech ends
  const END_HOLD_MS = 8000;             // extra stillness at the end

  // timeout refs so we can cancel pending auto-advance + TTS fallback
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track when a step started so we can enforce MIN_STEP_MS
  const stepStartAtRef = useRef<number>(Date.now());
  useEffect(() => {
    if (!showGuide) return;
    stepStartAtRef.current = Date.now();
  }, [showGuide, stepIdx]);

  const clearAutoAdvanceTimeout = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);
  const clearTtsFallbackTimeout = useCallback(() => {
    if (ttsFallbackTimeoutRef.current) {
      clearTimeout(ttsFallbackTimeoutRef.current);
      ttsFallbackTimeoutRef.current = null;
    }
  }, []);

  const stopSpeak = useCallback(() => {
    try {
      Speech.stop();
    } catch {}
  }, []);

  const saveMutation = useMutation({
    mutationFn: upsertMeditation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meditations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeditation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meditations'] }),
  });

  // -----------------------------
  // Helpers: deserialize deeplink source safely
  // -----------------------------
  const safeDeserializeSource = useCallback((encoded: string): MeditationSource | null => {
    const raw = decodeURIComponent(encoded);

    // If your lib provides deserializeMeditationSource, use it.
    try {
      // @ts-ignore
      if (typeof deserializeMeditationSource === 'function') {
        // @ts-ignore
        const v = deserializeMeditationSource(raw) as MeditationSource | null;
        return v ?? null;
      }
    } catch {}

    // Fallback: attempt JSON parse
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      if (typeof (obj as any).kind !== 'string') return null;
      return obj as MeditationSource;
    } catch {
      return null;
    }
  }, []);

  // Load default source + voice pref
  useEffect(() => {
    (async () => {
      const d = await getDefaultMeditationSource();
      setDefaultSourceState(d);

      const rawVoice = await AsyncStorage.getItem(VOICE_PREF_KEY);
      if (rawVoice) {
        try {
          setVoicePref(JSON.parse(rawVoice) as VoicePref);
        } catch {}
      }
    })();
  }, []);

  // Load device voices
  useEffect(() => {
    (async () => {
      try {
        const v = await Speech.getAvailableVoicesAsync();
        setVoices(Array.isArray(v) ? v : []);
      } catch {
        setVoices([]);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(VOICE_PREF_KEY, JSON.stringify(voicePref)).catch(() => {});
  }, [voicePref]);

  // Resume active across reload
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(ACTIVE_KEY);
      if (raw) setActive(JSON.parse(raw));
    })();
  }, []);

  useEffect(() => {
    if (active) AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
    else AsyncStorage.removeItem(ACTIVE_KEY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // Timer effect
  useEffect(() => {
    if (!active) return;
    const start = new Date(active.startTime).getTime();

    tickRef.current = setInterval(() => {
      setElapsed(Math.max(0, Math.round((Date.now() - start) / 1000)));
    }, 250);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [active?.id]);

  const unloadAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {
      console.warn('Audio unload error:', e);
    } finally {
      setAudioPlaying(false);
      setAudioLoading(false);
    }
  };

  // Cleanup: stop speech + unload audio + clear timers on unmount
  useEffect(() => {
    return () => {
      clearAutoAdvanceTimeout();
      clearTtsFallbackTimeout();
      try {
        Speech.stop();
      } catch {}
      void unloadAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If app backgrounds during guide, stop voice/timers (prevents weird “race”)
  useEffect(() => {
    const onAppState = (st: AppStateStatus) => {
      if (st !== 'active') {
        clearAutoAdvanceTimeout();
        clearTtsFallbackTimeout();
        stopSpeak();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [clearAutoAdvanceTimeout, clearTtsFallbackTimeout, stopSpeak]);

  /**
   * ✅ Speech wrapper
   * - Uses onDone/onStopped when available
   * - Adds conservative fallback timer (prevents instant-advance bug from notif launch)
   */
  const speak = useCallback(
    (text: string, onAfterSpeech?: () => void) => {
      if (!voiceOn) return;

      try {
        Speech.stop();
        clearTtsFallbackTimeout();

        let didFire = false;
        const fireOnce = () => {
          if (didFire) return;
          didFire = true;
          clearTtsFallbackTimeout();
          onAfterSpeech?.();
        };

        Speech.speak(text, {
          rate: 0.88, // slightly slower = more “guided”
          pitch: 1.0,
          voice: voicePref.voiceId ?? undefined,
          onDone: fireOnce,
          onStopped: fireOnce,
          onError: fireOnce,
        });

        // Fallback estimate: min 5s, + ~70ms/char, cap at 60s
        const estMs = Math.min(60000, Math.max(5000, 1500 + text.length * 70));
        ttsFallbackTimeoutRef.current = setTimeout(fireOnce, estMs);
      } catch (e) {
        console.warn('TTS error:', e);
      }
    },
    [voiceOn, voicePref.voiceId, clearTtsFallbackTimeout]
  );

  const ensureAudioLoaded = async () => {
    const url = selectedScript?.audioUrl;
    if (!url) return false;
    if (soundRef.current) return true;

    setAudioLoading(true);
    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: false, isLooping: false });

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        setAudioPlaying(status.isPlaying);
        if ((status as any).didJustFinish) setAudioPlaying(false);
      });

      soundRef.current = sound;
      return true;
    } catch (e) {
      console.warn('Audio load error:', e);
      Alert.alert('Audio error', 'Could not load the meditation audio.');
      await unloadAudio();
      return false;
    } finally {
      setAudioLoading(false);
    }
  };

  const toggleAudio = async () => {
    const url = selectedScript?.audioUrl;
    if (!url) {
      Alert.alert('No audio', 'This practice does not have an audio track yet.');
      return;
    }

    const ok = await ensureAudioLoaded();
    if (!ok || !soundRef.current) return;

    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      clearAutoAdvanceTimeout();
      clearTtsFallbackTimeout();
      stopSpeak();
      await soundRef.current.playAsync();
    }
  };

  const startExternalInApp = (title: string, url: string) => {
    setExternalTitle(title);
    setExternalUrl(url);
    setExternalOpen(true);
  };

  const openGuideAtStep = useCallback(
    (idx: number) => {
      clearAutoAdvanceTimeout();
      clearTtsFallbackTimeout();
      stopSpeak();
      setShowGuide(true);
      setStepIdx(idx);
    },
    [clearAutoAdvanceTimeout, clearTtsFallbackTimeout, stopSpeak]
  );

  const [isStopping, setIsStopping] = useState(false);

  const onStop = useCallback(async () => {
    if (!active) return;
    if (isStopping) return;
    setIsStopping(true);

    try {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }

      clearAutoAdvanceTimeout();
      clearTtsFallbackTimeout();
      stopSpeak();
      await unloadAudio();

      const finished = finishMeditation(active);
      await saveMutation.mutateAsync(finished);

      try {
        const { syncAll } = await import('@/lib/sync');
        await syncAll();
      } catch (syncError) {
        console.warn('Failed to sync meditation session:', syncError);
      }

      setActive(null);
      setNote('');
      setElapsed(0);
      setShowGuide(false);
      setStepIdx(0);
    } finally {
      setIsStopping(false);
    }
  }, [active, isStopping, clearAutoAdvanceTimeout, clearTtsFallbackTimeout, stopSpeak, saveMutation]);

  // ✅ Auto-finish navigation (NO "Dashboard" route!)
  const afterAutoFinishNavigate = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) navigateToSleep();
    else navigateToHome();
  }, []);

  // ✅ Speak current step + auto-advance (slow + safe + finishes session)
  useEffect(() => {
    if (!showGuide) return;
    if (!selectedScript) return;

    // If voice is off, we don't auto-advance (no reliable “done”)
    if (!voiceOn) return;

    const step = selectedScript.steps?.[stepIdx];
    const text = step?.instruction?.trim();
    if (!text) return;

    clearAutoAdvanceTimeout();
    clearTtsFallbackTimeout();

    const lastIdx = selectedScript.steps.length - 1;

    speak(text, async () => {
      if (!autoAdvanceOn) return;

      const stepElapsed = Date.now() - stepStartAtRef.current;
      const remainingForMin = Math.max(0, MIN_STEP_MS - stepElapsed);
      const waitMs = Math.max(AFTER_SPEECH_PAUSE_MS, remainingForMin);

      // Last step: hold, stop+save, then navigate
      if (stepIdx >= lastIdx) {
        autoAdvanceTimeoutRef.current = setTimeout(async () => {
          await onStop();
          if (autoStart) afterAutoFinishNavigate();
        }, Math.max(END_HOLD_MS, waitMs));
        return;
      }

      // Otherwise advance after wait
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        setStepIdx((prev) => Math.min(prev + 1, lastIdx));
      }, waitMs);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, showGuide, voiceOn, autoAdvanceOn, selectedScript?.id]);

  // ✅ Auto-start via deep link: pick source/type + set selectedType
  useEffect(() => {
    if (!autoStart) return;
    if (active) return;

    (async () => {
      if (params.source) {
        const src = safeDeserializeSource(params.source);
        if (!src) return;

        setDefaultSourceState(src);
        await setDefaultMeditationSource(src);

        if (isScriptSource(src)) {
          setSelectedType(src.scriptId);
          return;
        }
        if (isBuiltInSource(src)) {
          setSelectedType(src.type);
          return;
        }

        // External/audio: open modal (do NOT start script guide)
        if (isAudioSource(src)) {
          startExternalInApp(src.title, src.audioUrl);
          return;
        }
        if (isExternalSource(src)) {
          startExternalInApp(src.title, src.url);
          return;
        }
        return;
      }

      if (params.type) {
        setSelectedType(params.type);
        return;
      }

      const d = await getDefaultMeditationSource();
      if (!d) return;

      if (isScriptSource(d)) setSelectedType(d.scriptId);
      else if (isBuiltInSource(d)) setSelectedType(d.type);
      else if (isAudioSource(d)) startExternalInApp(d.title, d.audioUrl);
      else if (isExternalSource(d)) startExternalInApp(d.title, d.url);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, params.source, params.type]);

  const onStart = (_fromDeeplink = false) => {
    if (!selectedType) {
      Alert.alert('Select a meditation type first.');
      return;
    }
    if (active) return;

    const s = createMeditationStart(note?.trim() ? note : undefined, selectedType);
    setActive(s);
    setElapsed(0);

    openGuideAtStep(0);
  };

  // Guard so autoStart doesn’t double-trigger (notif + state changes)
  const didAutoStartRef = useRef(false);

  useEffect(() => {
    if (!autoStart) return;
    if (active) return;
    if (!selectedScript) return;
    if (!selectedType) return;
    if (didAutoStartRef.current) return;

    didAutoStartRef.current = true;
    const id = setTimeout(() => onStart(true), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, selectedScript?.id, selectedType]);

  const onSaveNoteToSelected = async (s: MeditationSession, newNote: string) => {
    await saveMutation.mutateAsync({ ...s, note: newNote });
  };

  const [editing, setEditing] = useState<{ id: string; note: string } | null>(null);

  // -----------------------------
  // UI components
  // -----------------------------
  const HeroCard = () => (
    <Card mode="elevated" style={{ borderRadius: 20, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 10 }}>
          <MaterialCommunityIcons name="meditation" size={22} color={theme.colors.primary} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            Meditation
          </Text>
        </View>

        <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
          Guided practice with voice + auto-advance, and a default “auto meditation” you can schedule.
        </Text>

        <View style={{ marginTop: 14 }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Default auto meditation</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {defaultSource ? labelForSource(defaultSource) : 'Not set'}
          </Text>

          <View style={{ flexDirection: 'row', columnGap: 10, marginTop: 12 }}>
            <Button mode="outlined" onPress={() => setLibraryOpen(true)}>
              Choose
            </Button>
            {defaultSource ? (
              <Button mode="text" onPress={() => setLibraryOpen(true)}>
                Replace
              </Button>
            ) : null}
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const SpotifyPlaceholderCard = () => (
    <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
      <Card.Content>
        <SectionHeader title="Spotify (coming soon)" icon="music" />
        <Text style={{ marginTop: 10, color: theme.colors.onSurfaceVariant }}>
          Planned: link Spotify sessions/playlists as meditation sources (e.g., guided meditations), and optionally log them as sessions.
        </Text>
        <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          Placeholder only — no integration in this release.
        </Text>
      </Card.Content>
    </Card>
  );

  const pickerSurfaceBg = theme.colors.surfaceVariant ?? theme.colors.surface;
  const pickerText = theme.colors.onSurface;
  const pickerMuted = theme.colors.onSurfaceVariant;

  const SelectPracticeCard = () => (
    <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
      <Card.Content>
        <SectionHeader title="Select practice" icon="meditation" />

        <View style={{ marginTop: 12 }}>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
            For YouTube/external meditations, choose them from the Library and set as your default.
          </Text>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            borderRadius: 12,
            marginTop: 12,
            overflow: 'hidden',
            backgroundColor: pickerSurfaceBg,
          }}
        >
          <Picker
            selectedValue={selectedType}
            onValueChange={(v: MeditationType | undefined) => setSelectedType(v)}
            style={{ color: pickerText, backgroundColor: pickerSurfaceBg }}
            dropdownIconColor={pickerText}
          >
            <Picker.Item label="Select..." value={undefined} color={pickerMuted as any} />
            {MEDITATION_CATALOG.map((m) => (
              <Picker.Item key={m.id} label={`${m.name} (${m.estMinutes}m)`} value={m.id} color={pickerText as any} />
            ))}
          </Picker>
        </View>

        <TextInput
          mode="outlined"
          label="Optional note"
          placeholder="Anything you'd like to focus on..."
          value={note}
          onChangeText={(t: string) => setNote(t)}
          multiline
          style={{ marginTop: 16 }}
        />

        {selectedScript ? (
          <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
            {selectedScript.estMinutes} min · {selectedScript.steps.length} steps
          </Text>
        ) : null}

        <Divider style={{ marginVertical: 14 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Voice guidance</Text>
          <Switch value={voiceOn} onValueChange={(v: boolean) => setVoiceOn(v)} />
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Voice</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              borderRadius: 12,
              marginTop: 8,
              overflow: 'hidden',
              backgroundColor: pickerSurfaceBg,
            }}
          >
            <Picker
              selectedValue={voicePref.voiceId ?? 'auto'}
              onValueChange={(v: string) => setVoicePref({ voiceId: v === 'auto' ? null : v })}
              style={{ color: pickerText, backgroundColor: pickerSurfaceBg }}
              dropdownIconColor={pickerText}
            >
              <Picker.Item label="Auto (recommended)" value="auto" color={pickerText as any} />
              {voices
                .filter((v) => (v.language ?? '').toLowerCase().startsWith('en'))
                .map((v) => (
                  <Picker.Item
                    key={v.identifier}
                    label={`${v.name} (${v.language}${v.quality ? ` · ${v.quality}` : ''})`}
                    value={v.identifier}
                    color={pickerText as any}
                  />
                ))}
              {voices.filter((v) => (v.language ?? '').toLowerCase().startsWith('en')).length === 0 &&
                voices.map((v) => (
                  <Picker.Item
                    key={v.identifier}
                    label={`${v.name} (${v.language}${v.quality ? ` · ${v.quality}` : ''})`}
                    value={v.identifier}
                    color={pickerText as any}
                  />
                ))}
            </Picker>
          </View>

          <Text style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
            Let users pick the voice they like (gender isn’t reliably exposed across platforms).
          </Text>
        </View>

        <View style={{ flexDirection: 'row', columnGap: 12, marginTop: 16 }}>
          <Button mode="contained" onPress={() => onStart(false)} disabled={!selectedType}>
            Start
          </Button>
          <Button mode="outlined" onPress={() => setLibraryOpen(true)}>
            Library
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const ActiveSessionCard = () => (
    <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
      <Card.Content>
        <SectionHeader title="Active session" icon="timer-outline" />

        <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, marginTop: 10 }}>
          {fmtHMS(elapsed)}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {active?.meditationType ? getMeditationById(active.meditationType)?.name : 'Meditation'}
        </Text>

        {selectedScript?.audioUrl ? (
          <View style={{ marginTop: 12 }}>
            <Button mode="outlined" loading={audioLoading} onPress={toggleAudio}>
              {audioPlaying ? 'Pause audio' : 'Play audio'}
            </Button>
            <Text style={{ marginTop: 6, fontSize: 12, color: theme.colors.onSurfaceVariant }}>
              Audio track available for this practice.
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', columnGap: 12, marginTop: 16 }}>
          <Button mode="contained" onPress={onStop} loading={isStopping}>
            Stop & save
          </Button>
          {selectedScript ? (
            <Button mode="outlined" onPress={() => openGuideAtStep(stepIdx)}>
              Open guide
            </Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );

  const ListItem = ({ item }: { item: MeditationSession }) => {
    const dur =
      item.durationSec ??
      (item.endTime ? Math.max(0, Math.round((+new Date(item.endTime) - +new Date(item.startTime)) / 1000)) : 0);

    const typeName = item.meditationType ? getMeditationById(item.meditationType)?.name ?? item.meditationType : 'Meditation';

    return (
      <Card mode="outlined" style={{ borderRadius: cardRadius, marginBottom: 12, backgroundColor: cardSurface }}>
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
            <Button mode="outlined" onPress={() => setEditing({ id: item.id, note: item.note ?? '' })}>
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

  const HistoryCard = () => (
    <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: sectionSpacing }}>
      <Card.Content>
        <SectionHeader title="History" icon="history" />
        <View style={{ marginTop: 10 }}>
          {sessions?.length ? (
            sessions.map((session) => <ListItem key={session.id} item={session} />)
          ) : (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              No sessions yet.
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}
      keyboardShouldPersistTaps="handled"
    >
      <HeroCard />

      {!active ? <SelectPracticeCard /> : <ActiveSessionCard />}

      {/* Placeholder for future release */}
      <SpotifyPlaceholderCard />

      <HistoryCard />

      {/* Library modal */}
      <MeditationLibraryModal
        visible={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onPickSource={async (src: MeditationSource) => {
          setDefaultSourceState(src);
          await setDefaultMeditationSource(src);

          if (isScriptSource(src)) setSelectedType(src.scriptId);
          if (isBuiltInSource(src)) setSelectedType(src.type);

          if (isExternalSource(src)) startExternalInApp(src.title, src.url);
          if (isAudioSource(src)) startExternalInApp(src.title, src.audioUrl);
        }}
      />

      {/* External playback modal */}
      <ExternalMediaModal
        visible={externalOpen}
        title={externalTitle}
        url={externalUrl}
        onClose={() => setExternalOpen(false)}
      />

      {/* Guided steps modal */}
      <Modal
        visible={showGuide}
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => {
          clearAutoAdvanceTimeout();
          clearTtsFallbackTimeout();
          stopSpeak();
          setShowGuide(false);
        }}
        transparent
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
          <View style={{ padding: 12 }}>
            <Card style={{ borderRadius: 18, backgroundColor: cardSurface }}>
              <Card.Content>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
                  {selectedScript?.name}
                </Text>

                <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Voice guidance</Text>
                  <Switch value={voiceOn} onValueChange={(v: boolean) => setVoiceOn(v)} />
                </View>

                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Auto-advance</Text>
                  <Switch value={autoAdvanceOn} onValueChange={(v: boolean) => setAutoAdvanceOn(v)} />
                </View>

                <Text style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                  Auto-advance keeps each step for at least {Math.round(MIN_STEP_MS / 1000)}s and pauses after speech.
                </Text>

                <Divider style={{ marginVertical: 12 }} />

                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  {currentStep?.title}
                </Text>
                <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
                  {currentStep?.instruction}
                </Text>

                <View style={{ flexDirection: 'row', columnGap: 12, marginTop: 14 }}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      const text = currentStep?.instruction?.trim();
                      if (!text) return;
                      clearAutoAdvanceTimeout();
                      clearTtsFallbackTimeout();
                      speak(text);
                    }}
                    disabled={!currentStep?.instruction}
                  >
                    Speak
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => {
                      clearAutoAdvanceTimeout();
                      clearTtsFallbackTimeout();
                      stopSpeak();
                    }}
                  >
                    Stop voice
                  </Button>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
                  <Button
                    mode="outlined"
                    disabled={stepIdx === 0}
                    onPress={() => {
                      clearAutoAdvanceTimeout();
                      clearTtsFallbackTimeout();
                      stopSpeak();
                      setStepIdx((prev) => Math.max(0, prev - 1));
                    }}
                  >
                    Back
                  </Button>

                  <Button
                    mode="contained"
                    onPress={async () => {
                      if (!selectedScript) return;

                      clearAutoAdvanceTimeout();
                      clearTtsFallbackTimeout();
                      stopSpeak();

                      const lastIdx = selectedScript.steps.length - 1;
                      if (stepIdx < lastIdx) setStepIdx(stepIdx + 1);
                      else {
                        await onStop();
                        if (autoStart) afterAutoFinishNavigate();
                      }
                    }}
                  >
                    {selectedScript && stepIdx < selectedScript.steps.length - 1 ? 'Next' : 'Done'}
                  </Button>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                  <Button
                    mode="text"
                    onPress={() => {
                      clearAutoAdvanceTimeout();
                      clearTtsFallbackTimeout();
                      stopSpeak();
                      setShowGuide(false);
                    }}
                  >
                    Close
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Edit note modal */}
      <Modal
        visible={!!editing}
        transparent
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setEditing(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
          <Card style={{ borderRadius: 20, backgroundColor: cardSurface }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 12, color: theme.colors.onSurface }}>
                Edit note
              </Text>
              <TextInput
                mode="outlined"
                value={editing?.note ?? ''}
                onChangeText={(t: string) => setEditing((ed) => (ed ? { ...ed, note: t } : ed))}
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
