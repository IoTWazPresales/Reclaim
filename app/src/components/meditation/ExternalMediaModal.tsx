// C:\Reclaim\app\src\components\meditation\ExternalMediaModal.tsx
import React, { useMemo } from 'react';
import { Modal, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { WebView } from 'react-native-webview';

function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // youtu.be/<id>
    if (host.includes('youtu.be')) {
      const id = u.pathname.replace('/', '').trim();
      return `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&playsinline=1`;
    }
    // youtube.com/watch?v=<id>
    if (host.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&playsinline=1`;
    }
  } catch {}
  return url;
}

export function ExternalMediaModal({
  visible,
  title,
  url,
  onClose,
}: {
  visible: boolean;
  title: string;
  url: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const cardSurface = theme.colors.surface;

  const mediaUrl = useMemo(() => {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return toYouTubeEmbed(url);
    return url;
  }, [url]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ padding: 12 }}>
          <Card style={{ borderRadius: 18, backgroundColor: cardSurface, overflow: 'hidden' }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                {title}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Playing inside the app (keep eyes closed if you want).
              </Text>
            </Card.Content>

            <View style={{ height: 320, backgroundColor: theme.colors.surfaceVariant }}>
              <WebView
                source={{ uri: mediaUrl }}
                javaScriptEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                // Helpful for YouTube audio
                allowsFullscreenVideo={false}
              />
            </View>

            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <Button mode="contained" onPress={onClose}>
                  Done / Close
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </View>
    </Modal>
  );
}
