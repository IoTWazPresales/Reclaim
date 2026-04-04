import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton, Modal, Portal, Text, useTheme } from 'react-native-paper';

import { logger } from '@/lib/logger';
import { CRISIS_HELPLINE_LABEL, CRISIS_HELPLINE_URL } from '@/lib/storeCompliance';
import { useAppTheme } from '@/theme';
import { reclaimUtilityCardSurface } from '@/theme/reclaimVisualLanguage';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const MOOD_OPTIONS: Array<{
  score: number;
  label: string;
  hint: string;
  icon: IconName;
}> = [
  { score: 1, label: 'Heavy', hint: 'Rough or numb', icon: 'weather-fog' },
  { score: 2, label: 'Low', hint: 'Drained or flat', icon: 'emoticon-sad-outline' },
  { score: 3, label: 'Steady', hint: 'Okay, mixed', icon: 'emoticon-neutral-outline' },
  { score: 4, label: 'Light', hint: 'Somewhat uplifted', icon: 'emoticon-happy-outline' },
  { score: 5, label: 'Grounded', hint: 'Calm or strong', icon: 'emoticon-cool-outline' },
];

export type DashboardMoodCheckInModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onSelectMood: (score: number) => void;
  onOpenMoodDetails: () => void;
  isSubmitting: boolean;
};

export function DashboardMoodCheckInModal({
  visible,
  onDismiss,
  onSelectMood,
  onOpenMoodDetails,
  isSubmitting,
}: DashboardMoodCheckInModalProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const dark = theme.dark;
  const surfaceShell = useMemo(() => reclaimUtilityCardSurface(appTheme, 'journey'), [appTheme]);

  const cellBorder = dark ? 'rgba(140, 175, 235, 0.14)' : 'rgba(37, 99, 235, 0.12)';
  const cellBg = dark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(37, 99, 235, 0.045)';
  const cellBgPressed = dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(37, 99, 235, 0.09)';
  const iconTint = dark ? 'rgba(186, 210, 250, 0.88)' : theme.colors.primary;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalRoot}>
        <View style={[styles.sheet, surfaceShell, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                How are you right now?
              </Text>
              <Text variant="bodySmall" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                One tap logs. Optional detail on the Mood tab.
              </Text>
            </View>
            <IconButton
              icon="close"
              size={22}
              onPress={onDismiss}
              accessibilityLabel="Dismiss mood check-in"
              style={styles.closeBtn}
              iconColor={theme.colors.onSurfaceVariant}
            />
          </View>

          <View style={styles.optionsRow}>
            {MOOD_OPTIONS.map((opt) => (
              <Pressable
                key={opt.score}
                disabled={isSubmitting}
                onPress={() => onSelectMood(opt.score)}
                accessibilityRole="button"
                accessibilityLabel={`Log mood: ${opt.label}, ${opt.score} of 5. ${opt.hint}`}
                style={({ pressed }) => [
                  styles.optionCell,
                  {
                    borderColor: cellBorder,
                    backgroundColor: pressed || isSubmitting ? cellBgPressed : cellBg,
                    opacity: isSubmitting ? 0.55 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons name={opt.icon} size={18} color={iconTint} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[styles.optionLabel, { color: theme.colors.onSurface }]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onOpenMoodDetails}
            disabled={isSubmitting}
            hitSlop={8}
            style={({ pressed }) => [styles.detailsLink, { opacity: pressed ? 0.65 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Open Mood tab for tags, notes, and history"
          >
            <Text style={[styles.detailsLinkText, { color: theme.colors.primary }]}>
              Tags, note & history on Mood
            </Text>
          </Pressable>

          <View
            style={[
              styles.supportRow,
              { borderTopColor: dark ? 'rgba(130, 155, 195, 0.1)' : 'rgba(15, 23, 42, 0.07)' },
            ]}
          >
            <Text style={[styles.supportMuted, { color: theme.colors.onSurfaceVariant }]}>Need help now? </Text>
            <Pressable
              onPress={() =>
                Linking.openURL(CRISIS_HELPLINE_URL).catch((e) => {
                  if (__DEV__) logger.debug('[DashboardMoodCheckInModal]', e);
                })
              }
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
              accessibilityLabel={`Open ${CRISIS_HELPLINE_LABEL}`}
              accessibilityRole="link"
            >
              <Text style={[styles.supportLink, { color: theme.colors.primary }]}>{CRISIS_HELPLINE_LABEL}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    marginHorizontal: 20,
    justifyContent: 'center',
  },
  sheet: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    paddingRight: 2,
    minWidth: 0,
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.2,
    fontSize: 18,
    lineHeight: 24,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.9,
  },
  closeBtn: {
    margin: 0,
    marginTop: -8,
    marginRight: -10,
  },
  optionsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 6,
  },
  optionCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  detailsLink: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 2,
  },
  detailsLinkText: {
    fontSize: 11,
    fontWeight: '600',
  },
  supportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  supportMuted: {
    fontSize: 10,
    lineHeight: 14,
    opacity: 0.82,
  },
  supportLink: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
