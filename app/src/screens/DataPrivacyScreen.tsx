import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { Button, Card, List, Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import {
  reclaimSectionCardShell,
  reclaimPrimaryCapsuleButton,
  reclaimSecondaryCapsuleButton,
  reclaimGhostCapsuleButton,
} from '@/theme/reclaimVisualLanguage';
import { reclaimStandardScreenScroll } from '@/theme/reclaimScreenLayout';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';

import { exportUserData, exportUserDataCsv, exportUserDataPdf, deleteAllPersonalData } from '@/lib/dataPrivacy';
import { logTelemetry } from '@/lib/telemetry';
import { MEDICAL_DISCLAIMER, HEALTHCARE_REMINDER, PRIVACY_POLICY_URL } from '@/lib/storeCompliance';
import { logger } from '@/lib/logger';
import { HealthConnectDataUseMap } from '@/components/health/HealthConnectDataUseMap';

export default function DataPrivacyScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const sectionShell = useMemo(() => reclaimSectionCardShell(appTheme), [appTheme]);
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const secondaryCapsule = useMemo(() => reclaimSecondaryCapsuleButton(appTheme), [appTheme]);
  const ghostCapsule = useMemo(() => reclaimGhostCapsuleButton(appTheme), [appTheme]);
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
      const fileUri = await exportUserDataPdf();
      await logTelemetry({ name: 'data_export_pdf', properties: { fileUri } });
      Alert.alert(
        'PDF ready',
        'Your health summary PDF has been generated. Share or save it from the share sheet.',
      );
    } catch (error: any) {
      Alert.alert('PDF failed', error?.message ?? 'Unable to generate PDF right now.');
    } finally {
      setPreparingPdf(false);
    }
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete your data?',
      'This will permanently remove your medication history, mood check-ins, sleep records, your on-device SQLite mirrors, local caches, and any connected badges. You will be signed out and cannot undo this action.',
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
                'Your data has been removed from this device and Reclaim\'s servers. Sign back in to start fresh.',
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

  const openPrivacyPolicy = useCallback(() => {
    Linking.openURL(PRIVACY_POLICY_URL).catch((e) => { if (__DEV__) logger.debug('[DataPrivacyScreen]', e); });
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={reclaimStandardScreenScroll}
    >
      <Card mode="elevated" style={[sectionShell as any, { marginBottom: 16 }]}>
        <Card.Content>
          <FeatureCardHeader icon="shield-account" title="Privacy policy" />
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
            Our privacy policy explains how we collect, use, and protect your data.
          </Text>
          <Button
            mode="outlined"
            onPress={openPrivacyPolicy}
            compact
            icon="open-in-new"
            style={secondaryCapsule.style}
            contentStyle={secondaryCapsule.contentStyle}
            labelStyle={secondaryCapsule.labelStyle}
          >
            View privacy policy
          </Button>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={[sectionShell as any, { marginBottom: 16 }]}>
        <Card.Content>
          <FeatureCardHeader icon="medical-bag" title="Health disclaimer" />
          <Text variant="bodySmall" style={{ marginBottom: 8, opacity: 0.9 }}>
            {MEDICAL_DISCLAIMER}
          </Text>
          <Text variant="bodySmall" style={{ opacity: 0.9 }}>
            {HEALTHCARE_REMINDER}
          </Text>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={[sectionShell as any, { marginBottom: 16 }]}>
        <Card.Content>
          <FeatureCardHeader icon="database-lock" title="Your data, your call" />
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
            Reclaim stores your information securely with encrypted transport. A local SQLite database on
            this device also holds operational mirrors (for example sleep and pending mood entries) so the
            app works offline. You can export or erase everything at any time.
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
            description="Only severe errors are reported to Reclaim; no personal content is included."
            left={() => <List.Icon icon="alert-circle-outline" />}
          />
        </Card.Content>
      </Card>

      <Card mode="elevated" style={[sectionShell as any, { marginBottom: 16 }]}>
        <Card.Content>
          <FeatureCardHeader icon="heart-pulse" title="Health Connect data we use" />
          <View style={{ marginTop: 4 }}>
            <HealthConnectDataUseMap hideTitle />
          </View>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={[sectionShell as any, { marginBottom: 16 }]}>
        <Card.Content>
          <FeatureCardHeader icon="download" title="Export or reset" />
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            Download structured copies (cloud plus on-device SQLite where available), or wipe cloud data,
            your local database rows, and legacy storage — then sign out.
          </Text>

          <List.Section style={{ paddingVertical: 0 }}>
            <List.Item
              title="CSV report"
              description="Summaries of mood, sleep, and medication logs with clean headers."
              descriptionNumberOfLines={0}
              left={() => <List.Icon icon="file-delimited" />}
              right={() => (
                <Button
                  mode="contained"
                  onPress={handleExportCsv}
                  loading={exportingCsv}
                  disabled={exportingJson || preparingPdf || deleting}
                  compact
                  style={primaryCapsule.style}
                  contentStyle={primaryCapsule.contentStyle}
                  labelStyle={primaryCapsule.labelStyle}
                >
                  CSV
                </Button>
              )}
            />
            <List.Item
              title="Raw JSON backup"
              description="Cloud tables plus a structured localData section from this device's SQLite mirrors."
              descriptionNumberOfLines={0}
              left={() => <List.Icon icon="code-json" />}
              right={() => (
                <Button
                  mode="outlined"
                  onPress={handleExportJson}
                  loading={exportingJson}
                  disabled={exportingCsv || preparingPdf || deleting}
                  compact
                  style={secondaryCapsule.style}
                  contentStyle={secondaryCapsule.contentStyle}
                  labelStyle={secondaryCapsule.labelStyle}
                >
                  JSON
                </Button>
              )}
            />
            <List.Item
              title="PDF summary"
              description="Printable overview of Mood, Sleep, and Medications for clinician review."
              left={() => <List.Icon icon="file-pdf-box" />}
              right={() => (
                <Button
                  mode="text"
                  onPress={handlePreparePdf}
                  loading={preparingPdf}
                  disabled={exportingCsv || exportingJson || deleting}
                  compact
                  style={ghostCapsule.style}
                  contentStyle={ghostCapsule.contentStyle}
                  labelStyle={ghostCapsule.labelStyle}
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
              Removes all personal data from Reclaim's servers, clears local caches, and signs you out.
            </Text>
            <Button
              mode="outlined"
              onPress={handleDelete}
              loading={deleting}
              disabled={exportingCsv || exportingJson || preparingPdf}
              textColor={theme.colors.error}
              style={[secondaryCapsule.style, { marginTop: 12, borderColor: theme.colors.error }]}
              contentStyle={secondaryCapsule.contentStyle}
              labelStyle={secondaryCapsule.labelStyle}
            >
              Delete my data
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}



