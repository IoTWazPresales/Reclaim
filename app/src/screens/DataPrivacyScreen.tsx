import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Button, Card, List, Text, useTheme } from 'react-native-paper';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';

import { exportUserData, exportUserDataCsv, deleteAllPersonalData } from '@/lib/dataPrivacy';
import { logTelemetry } from '@/lib/telemetry';

export default function DataPrivacyScreen() {
  const theme = useTheme();
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportCsv = useCallback(async () => {
    try {
      setExportingCsv(true);
      const fileUri = await exportUserDataCsv();
      await logTelemetry({ name: 'data_export_csv', properties: { fileUri } });
      Alert.alert(
        'Export ready',
        'A CSV summary of your mood, sleep, and medication history is ready. Share or save it from the share sheet.',
      );
    } catch (error: any) {
      Alert.alert('Export failed', error?.message ?? 'Unable to export your data right now.');
    } finally {
      setExportingCsv(false);
    }
  }, []);

  const handleExportJson = useCallback(async () => {
    try {
      setExportingJson(true);
      const fileUri = await exportUserData();
      await logTelemetry({ name: 'data_export_drawer', properties: { fileUri } });
      Alert.alert(
        'Export ready',
        'A JSON export of your data has been generated. Share or save it from the share sheet.',
      );
    } catch (error: any) {
      Alert.alert('Export failed', error?.message ?? 'Unable to export your data right now.');
    } finally {
      setExportingJson(false);
    }
  }, []);

  const handlePreparePdf = useCallback(async () => {
    try {
      setPreparingPdf(true);
      await logTelemetry({ name: 'data_export_pdf_stub' });
      Alert.alert(
        'PDF summary coming soon',
        'A printable PDF summary with Mood, Sleep, and Medications will be available in an upcoming build.\n\n// TODO: integrate PDF generation pipeline.',
      );
    } catch (error: any) {
      console.warn('PDF stub error', error);
    } finally {
      setPreparingPdf(false);
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
        <Card.Content>
          <FeatureCardHeader icon="database-lock" title="Your data, your call" />
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
          <FeatureCardHeader icon="download" title="Export or reset" />
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            Download a structured copy of your records or wipe everything from Supabase.
          </Text>

          <List.Section style={{ paddingVertical: 0 }}>
            <List.Item
              title="CSV report"
              description="Summaries of mood, sleep, and medication logs with clean headers."
              left={() => <List.Icon icon="file-delimited" />}
              right={() => (
                <Button
                  mode="contained"
                  onPress={handleExportCsv}
                  loading={exportingCsv}
                  disabled={exportingJson || preparingPdf || deleting}
                  compact
                >
                  CSV
                </Button>
              )}
            />
            <List.Item
              title="Raw JSON backup"
              description="Exact Supabase tables as stored, useful for migrations."
              left={() => <List.Icon icon="code-json" />}
              right={() => (
                <Button
                  mode="outlined"
                  onPress={handleExportJson}
                  loading={exportingJson}
                  disabled={exportingCsv || preparingPdf || deleting}
                  compact
                >
                  JSON
                </Button>
              )}
            />
            <List.Item
              title="PDF summary (beta)"
              description="Printable overview of Mood, Sleep, and Meds. (Stubbed TODO)"
              left={() => <List.Icon icon="file-pdf-box" />}
              right={() => (
                <Button
                  mode="text"
                  onPress={handlePreparePdf}
                  loading={preparingPdf}
                  disabled={exportingCsv || exportingJson || deleting}
                  compact
                >
                  Preview
                </Button>
              )}
            />
          </List.Section>

          <View
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              backgroundColor: theme.colors.errorContainer,
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
              disabled={exportingCsv || exportingJson || preparingPdf}
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



