// C:\Reclaim\app\src\components\meditation\MeditationLibraryModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput, useTheme } from 'react-native-paper';

import { MEDITATION_CATALOG, getMeditationById, type MeditationType } from '@/lib/meditations';
import {
  addExternalMeditation,
  deleteExternalMeditation,
  inferProvider,
  listExternalMeditations,
  type MeditationSource,
  type StoredExternalMeditation,
} from '@/lib/meditationSources';

type BuiltInSource = Extract<MeditationSource, { kind: 'built_in' }>;
type ExternalSource = Extract<MeditationSource, { kind: 'external' }>;
type AudioSource = Extract<MeditationSource, { kind: 'audio' }>;

function labelForBuiltIn(type: MeditationType) {
  const script = getMeditationById(type);
  return script?.name ?? String(type);
}

function metaForBuiltIn(type: MeditationType) {
  const script = getMeditationById(type);
  if (!script) return '';
  const steps = Array.isArray((script as any).steps) ? (script as any).steps.length : 0;
  const mins = (script as any).estMinutes ?? undefined;
  return mins ? `${mins} min${steps ? ` · ${steps} steps` : ''}` : steps ? `${steps} steps` : '';
}

export function MeditationLibraryModal({
  visible,
  onClose,
  onPickSource,
}: {
  visible: boolean;
  onClose: () => void;
  onPickSource: (source: MeditationSource) => void;
}) {
  const theme = useTheme();
  const cardSurface = theme.colors.surface;

  const [stored, setStored] = useState<StoredExternalMeditation[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [estMin, setEstMin] = useState('10');

  const refresh = async () => {
    const rows = await listExternalMeditations();
    setStored(Array.isArray(rows) ? rows : []);
  };

  useEffect(() => {
    if (!visible) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const builtInSources: BuiltInSource[] = useMemo(() => {
    return MEDITATION_CATALOG.map((m) => ({ kind: 'built_in', type: m.id }));
  }, []);

  const externalRows: { storedId: string; src: ExternalSource | AudioSource }[] = useMemo(() => {
    // StoredExternalMeditation guarantees kind external|audio, but we still guard at runtime.
    const rows: { storedId: string; src: ExternalSource | AudioSource }[] = [];

    for (const x of stored) {
      const s = x?.source as any;
      if (!s || typeof s !== 'object') continue;

      if (s.kind === 'external' && typeof s.title === 'string' && typeof s.url === 'string') {
        rows.push({ storedId: x.id, src: s as ExternalSource });
      } else if (s.kind === 'audio' && typeof s.title === 'string' && typeof s.audioUrl === 'string') {
        rows.push({ storedId: x.id, src: s as AudioSource });
      }
    }

    return rows;
  }, [stored]);

  const onAdd = async () => {
    const t = title.trim();
    const u = url.trim();
    if (!t || !u) return;

    const parsed = parseInt(estMin, 10);
    const minutes = Number.isFinite(parsed) ? Math.max(1, Math.min(240, parsed)) : undefined;

    await addExternalMeditation({
      title: t,
      url: u,
      provider: inferProvider(u),
      estMinutes: minutes,
    });

    setTitle('');
    setUrl('');
    setEstMin('10');
    await refresh();
  };

  const pick = async (source: MeditationSource) => {
    // Parent screen handles persistence + setting default.
    onPickSource(source);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ padding: 12 }}>
          <Card style={{ borderRadius: 18, backgroundColor: cardSurface }}>
            <Card.Content>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
                Meditation Library
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                Pick a practice and set it as your default (used by auto-meditation triggers).
              </Text>

              <Divider style={{ marginVertical: 12 }} />

              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                Built-in
              </Text>

              <View style={{ marginTop: 10 }}>
                {builtInSources.map((src) => {
                  const label = labelForBuiltIn(src.type as MeditationType);
                  const meta = metaForBuiltIn(src.type as MeditationType);
                  return (
                    <Button
                      key={`builtin_${src.type}`}
                      mode="outlined"
                      style={{ marginBottom: 8, borderRadius: 12 }}
                      onPress={() => pick(src)}
                    >
                      {meta ? `${label}  —  ${meta}` : label}
                    </Button>
                  );
                })}
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                External (YouTube / links)
              </Text>

              <View style={{ marginTop: 10 }}>
                {externalRows.length ? (
                  externalRows.map(({ storedId, src }) => {
                    const subtitle = src.kind === 'external' ? src.url : src.audioUrl;
                    const meta = typeof src.estMinutes === 'number' ? `${src.estMinutes} min` : '';

                    return (
                      <View key={`ext_${storedId}`} style={{ marginBottom: 8 }}>
                        <Button mode="outlined" style={{ borderRadius: 12 }} onPress={() => pick(src)}>
                          {meta ? `${src.title}  —  ${meta}` : src.title}
                        </Button>
                        <Text
                          style={{ marginTop: 6, fontSize: 12, color: theme.colors.onSurfaceVariant }}
                          numberOfLines={1}
                        >
                          {subtitle}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>No external meditations added yet.</Text>
                )}
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                Add external meditation
              </Text>

              <TextInput
                mode="outlined"
                label="Title"
                value={title}
                onChangeText={(t: string) => setTitle(t)}
                style={{ marginTop: 10 }}
              />
              <TextInput
                mode="outlined"
                label="URL (YouTube or web link)"
                value={url}
                onChangeText={(t: string) => setUrl(t)}
                style={{ marginTop: 10 }}
                autoCapitalize="none"
              />
              <TextInput
                mode="outlined"
                label="Estimated minutes (optional)"
                value={estMin}
                onChangeText={(t: string) => setEstMin(t)}
                style={{ marginTop: 10 }}
                keyboardType="number-pad"
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <Button mode="outlined" onPress={onClose}>
                  Close
                </Button>
                <Button mode="contained" onPress={onAdd} disabled={!title.trim() || !url.trim()}>
                  Add
                </Button>
              </View>

              {stored.length ? (
                <>
                  <Divider style={{ marginVertical: 12 }} />
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Manage external items
                  </Text>

                  {stored.map((x) => {
                    const s = x.source;
                    const lineTitle = s.title;
                    const lineUrl = s.kind === 'external' ? s.url : s.audioUrl;

                    return (
                      <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.onSurface }}>{lineTitle}</Text>
                          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }} numberOfLines={1}>
                            {lineUrl}
                          </Text>
                        </View>
                        <Button
                          mode="text"
                          textColor={theme.colors.error}
                          onPress={async () => {
                            await deleteExternalMeditation(x.id);
                            await refresh();
                          }}
                        >
                          Delete
                        </Button>
                      </View>
                    );
                  })}
                </>
              ) : null}
            </Card.Content>
          </Card>
        </View>
      </View>
    </Modal>
  );
}
