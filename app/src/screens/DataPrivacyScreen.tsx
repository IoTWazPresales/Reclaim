import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Button, Card, List, Text, useTheme } from 'react-native-paper';

import { exportUserData, deleteAllPersonalData } from '@/lib/dataPrivacy';
import { logTelemetry } from '@/lib/telemetry';

export default function DataPrivacyScreen() {
  const theme = useTheme();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      const fileUri = await exportUserData();
      await logTelemetry({ name: 'data_export_drawer', properties: { fileUri } });
      Alert.alert(
        'Export ready',
        'A JSON export of your data has been generated. Share or save it from the share sheet.',
      );
    } catch (error: any) {
      Alert.alert('Export failed', error?.message ?? 'Unable to export your data right now.');
    } finally {
      setExporting(false);
    }
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete your data?',
      'This will permanently remove your medication history, mood check-ins, sleep records, and any connected badges. You will be signed out and cannot undo this action.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteAllPersonalData();
              await logTelemetry({ name: 'data_delete_drawer' });
              Alert.alert(
                'Done',
                'Your data has been removed from this device and Supabase. Sign back in to start fresh.',
              );
            } catch (error: any) {
              Alert.alert('Delete failed', error?.message ?? 'Unable to delete your data right now.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      <Card mode="elevated" style={{ borderRadius: 16, marginBottom: 16 }}>
        <Card.Title title="Your data, your call" />
        <Card.Content>
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
            Reclaim stores your information securely in Supabase with encrypted transport. You can
            export or erase everything at any time.
          </Text>
          <List.Item
            title="Encrypted storage"
            description="Sessions and tokens live in SecureStore with large session support."
            left={() => <List.Icon icon="shield-lock" />}
          />
          <List.Item
            title="Health providers"
            description="We only sync data from providers you connect explicitly."
            left={() => <List.Icon icon="heart-pulse" />}
          />
          <List.Item
            title="Telemetry"
            description="Only severe errors reach Supabase logs; no personal content is sent."
            left={() => <List.Icon icon="alert-circle-outline" />}
          />
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: 16 }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text variant="titleMedium">Export a copy</Text>
              <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
                Creates a JSON export with medications, moods, sleep sessions, and mindfulness entries.
              </Text>
            </View>
            <Button mode="contained" onPress={handleExport} loading={exporting} disabled={deleting}>
              Export
            </Button>
          </View>

          <View
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 12,
              backgroundColor: theme.colors.errorContainer ?? '#fee2e2',
            }}
          >
            <Text variant="titleMedium" style={{ color: theme.colors.error }}>
              Delete everything
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 6, opacity: 0.8 }}>
              Removes all personal data from Supabase, clears local caches, and signs you out.
            </Text>
            <Button
              mode="outlined"
              onPress={handleDelete}
              loading={deleting}
              disabled={exporting}
              textColor={theme.colors.error}
              style={{ marginTop: 12 }}
            >
              Delete my data
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}



