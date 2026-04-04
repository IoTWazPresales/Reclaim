import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Text, useTheme } from 'react-native-paper';
import { ActionCard } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { reclaimPrimaryCapsuleButton } from '@/theme/reclaimVisualLanguage';

export type PrimaryAction = {
  title: string;
  subtitle: string;
  meta: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  cta: string;
  onPress: () => void;
  loading: boolean;
};

export type DashboardPrimaryActionProps = {
  primaryAction: PrimaryAction;
  /** Dashboard home: premium command surface (clearer, firmer than state tiles). */
  emphasize?: boolean;
};

export function DashboardPrimaryAction({ primaryAction, emphasize = false }: DashboardPrimaryActionProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const primaryCapsule = reclaimPrimaryCapsuleButton(appTheme);
  const dark = theme.dark;

  const cardStyle = useMemo(() => {
    if (!emphasize) return undefined;
    return [
      styles.commandCard,
      {
        backgroundColor: dark ? '#141e30' : '#f1f4fa',
        borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.055)',
        shadowOpacity: dark ? 0.24 : 0.1,
        marginBottom: 0,
      },
    ];
  }, [dark, emphasize]);

  const contentContainerStyle = emphasize
    ? { alignItems: 'stretch' as const, paddingVertical: 13, paddingHorizontal: 14 }
    : undefined;

  const seamColor = dark ? 'rgba(56, 189, 248, 0.36)' : 'rgba(37, 99, 235, 0.4)';
  const dividerColor = dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)';
  const iconWellBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
  const iconWellBg = dark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.72)';

  return (
    <ActionCard
      feedbackScope={{ componentKey: 'dashboard-primary-action', componentTitle: 'Primary action' }}
      style={cardStyle}
      contentContainerStyle={contentContainerStyle}
    >
      <View style={styles.row}>
        {emphasize ? <View style={[styles.accentSeam, { backgroundColor: seamColor }]} /> : null}
        <View style={styles.contextBlock}>
          <View style={styles.contextInner}>
            <View
              style={
                emphasize
                  ? [
                      styles.iconWell,
                      {
                        backgroundColor: iconWellBg,
                        borderColor: iconWellBorder,
                      },
                    ]
                  : {
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      backgroundColor: theme.colors.surfaceVariant,
                    }
              }
            >
              <MaterialCommunityIcons name={primaryAction.icon} size={22} color={theme.colors.onSurface} />
            </View>
            <View style={styles.copyColumn}>
              <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                {primaryAction.title}
              </Text>
              <Text
                variant="bodySmall"
                style={[styles.subtitle, { color: theme.colors.onSurface }]}
                numberOfLines={2}
              >
                {primaryAction.subtitle}
              </Text>
              <Text
                variant="labelSmall"
                style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {primaryAction.meta}
              </Text>
            </View>
          </View>
        </View>
        {emphasize ? <View style={[styles.divider, { backgroundColor: dividerColor }]} /> : null}
        <View style={styles.actionColumn}>
          <Button
            mode="contained"
            compact={emphasize}
            onPress={primaryAction.onPress}
            loading={primaryAction.loading}
            disabled={primaryAction.loading}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            style={
              emphasize
                ? [
                    primaryCapsule.style,
                    styles.ctaButton,
                    {
                      borderWidth: 0,
                      shadowColor: dark ? '#000' : theme.colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: dark ? 0.22 : 0.12,
                      shadowRadius: 8,
                      elevation: emphasize ? 3 : 0,
                    },
                  ]
                : [primaryCapsule.style]
            }
            contentStyle={emphasize ? [styles.ctaContent, primaryCapsule.contentStyle] : primaryCapsule.contentStyle}
            labelStyle={emphasize ? [styles.ctaLabel, primaryCapsule.labelStyle, { color: theme.colors.onPrimary }] : primaryCapsule.labelStyle}
          >
            {primaryAction.cta}
          </Button>
        </View>
      </View>
    </ActionCard>
  );
}

const styles = StyleSheet.create({
  commandCard: {
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  accentSeam: {
    width: 3,
    borderRadius: 1.5,
    marginRight: 12,
    alignSelf: 'stretch',
    marginVertical: 2,
    opacity: 0.95,
  },
  contextBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  contextInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWell: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    borderWidth: 1,
  },
  copyColumn: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 3,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  meta: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
    opacity: 0.78,
  },
  divider: {
    width: StyleSheet.hairlineWidth * 2,
    alignSelf: 'stretch',
    marginHorizontal: 12,
    marginVertical: 4,
    opacity: 1,
  },
  actionColumn: {
    justifyContent: 'center',
    flexShrink: 0,
    paddingLeft: 2,
  },
  ctaButton: {
    minWidth: 108,
  },
  ctaContent: {
    paddingHorizontal: 4,
  },
  ctaLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
});
