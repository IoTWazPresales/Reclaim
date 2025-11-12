import React from 'react';
import { ScrollView, View } from 'react-native';
import Constants from 'expo-constants';
import { Card, Divider, List, Text, useTheme } from 'react-native-paper';

export default function AboutScreen() {
  const theme = useTheme();
  const manifestVersion = (Constants.manifest as Record<string, any> | null)?.version;
  const version =
    Constants.expoConfig?.version ??
    Constants.expoConfig?.extra?.appVersion ??
    manifestVersion ??
    '0.0.0';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      <Card mode="elevated" style={{ borderRadius: 16 }}>
        <Card.Title title="About Reclaim" />
        <Card.Content>
          <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
            Reclaim helps you track medications, mood, sleep, and mindfulness practice — all in one
            secure place. Sync with your preferred health providers and stay organised through daily
            check-ins.
          </Text>

          <List.Item title="Version" description={`v${version}`} left={() => <List.Icon icon="tag" />} />
          <List.Item
            title="Built with"
            description="Expo, React Native, Supabase, React Query, Zustand"
            left={() => <List.Icon icon="code-tags" />}
          />
          <Divider style={{ marginVertical: 16 }} />
          <View style={{ gap: 8 }}>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              Need help or have ideas? Reach out to the team and let us know how Reclaim can better
              support your recovery journey.
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              © {new Date().getFullYear()} Reclaim. All rights reserved.
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}



