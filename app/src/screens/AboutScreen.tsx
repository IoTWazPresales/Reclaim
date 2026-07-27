import React, { useMemo } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import Constants from 'expo-constants';
import { Button, Card, Divider, List, Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { reclaimSectionCardShell, reclaimGhostCapsuleButton, reclaimSecondaryCapsuleButton } from '@/theme/reclaimVisualLanguage';
import { reclaimStandardScreenScroll } from '@/theme/reclaimScreenLayout';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { PRIVACY_POLICY_URL } from '@/lib/storeCompliance';
import { logger } from '@/lib/logger';
import { Sentry } from '@/lib/sentry';

export default function AboutScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const sectionShell = useMemo(() => reclaimSectionCardShell(appTheme), [appTheme]);
  const ghostCapsule = useMemo(() => reclaimGhostCapsuleButton(appTheme), [appTheme]);
  const secondaryCapsule = useMemo(() => reclaimSecondaryCapsuleButton(appTheme), [appTheme]);
  const manifestVersion = (Constants.manifest as Record<string, any> | null)?.version;
  const version =
    Constants.expoConfig?.version ??
    Constants.expoConfig?.extra?.appVersion ??
    manifestVersion ??
    '0.0.0';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={reclaimStandardScreenScroll}
    >
      <Card mode="elevated" style={sectionShell as any}>
        <Card.Content>
          <FeatureCardHeader icon="information" title="About Reclaim" />
          <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
            Reclaim helps you track medications, mood, sleep, and mindfulness practice — all in one
            secure place. Sync with your preferred health providers and stay organised through daily
            check-ins.
          </Text>

          <List.Item title="Version" description={`v${version}`} left={() => <List.Icon icon="tag" />} />
          <Divider style={{ marginVertical: 16 }} />
          <Button
            mode="text"
            icon="open-in-new"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch((e) => { if (__DEV__) logger.debug('[AboutScreen]', e); })}
            compact
            style={[ghostCapsule.style, { alignSelf: 'flex-start', marginBottom: 8 }]}
            contentStyle={ghostCapsule.contentStyle}
            labelStyle={ghostCapsule.labelStyle}
          >
            Privacy policy
          </Button>
          <Button
            mode="text"
            icon="open-in-new"
            onPress={() =>
              Linking.openURL('http://creativecommons.org/licenses/by-sa/3.0/').catch((e) => {
                if (__DEV__) logger.debug('[AboutScreen] CC BY-SA link failed', e);
              })
            }
            compact
            style={[ghostCapsule.style, { alignSelf: 'flex-start', marginBottom: 8 }]}
            contentStyle={ghostCapsule.contentStyle}
            labelStyle={ghostCapsule.labelStyle}
          >
            Exercise illustrations by Everkinetic, CC BY-SA 3.0
          </Button>
          <View style={{ gap: 8 }}>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              Need help or have ideas? Reach out to the team and let us know how Reclaim can better
              support your mental health day to day.
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              © {new Date().getFullYear()} Reclaim. All rights reserved.
            </Text>
          </View>
          {__DEV__ && (
            <>
              <Divider style={{ marginVertical: 16 }} />
              <Button
                mode="outlined"
                onPress={() => Sentry.captureException(new Error('First error'))}
                style={[secondaryCapsule.style, { alignSelf: 'flex-start' }]}
                contentStyle={secondaryCapsule.contentStyle}
                labelStyle={secondaryCapsule.labelStyle}
              >
                Test Sentry
              </Button>
            </>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}



