/**
 * PaywallModal
 *
 * Full-screen premium upgrade modal shown when a user tries to access
 * a premium-gated feature.
 *
 * Design: dark premium feel, benefit list, single CTA, restore link.
 */

import React, { useCallback, useMemo } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePremium } from '@/lib/premium/usePremium';
import { useAppTheme } from '@/theme';
import { reclaimGhostCapsuleButton, reclaimPrimaryCapsuleButton } from '@/theme/reclaimVisualLanguage';

const BENEFITS = [
  { icon: 'brain', text: 'Full 80+ insight rule set, personalised to you' },
  { icon: 'file-chart-outline', text: 'Export your data report for your therapist or GP' },
  { icon: 'timeline-clock-outline', text: 'Full insight history — see how your signals evolved' },
  { icon: 'shield-check', text: 'Cross-domain correlation signals (sleep × mood × training)' },
  { icon: 'star-circle', text: 'Priority support and early feature access' },
] as const;

export type PaywallModalProps = {
  visible: boolean;
  featureDescription?: string;
  onDismiss: () => void;
  onSuccess?: () => void;
};

export function PaywallModal({ visible, featureDescription, onDismiss, onSuccess }: PaywallModalProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const ghostCapsule = useMemo(() => reclaimGhostCapsuleButton(appTheme), [appTheme]);
  const { width } = useWindowDimensions();
  const { isPremium, isLoading, error, purchasePremium, restorePurchases } = usePremium();

  const handlePurchase = useCallback(async () => {
    const success = await purchasePremium();
    if (success) {
      onSuccess?.();
      onDismiss();
    }
  }, [purchasePremium, onSuccess, onDismiss]);

  const handleRestore = useCallback(async () => {
    const success = await restorePurchases();
    if (success) {
      onSuccess?.();
      onDismiss();
    }
  }, [restorePurchases, onSuccess, onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(250)}
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.88)' }]}
      >
        <Animated.View
          entering={SlideInDown.duration(450).springify().damping(16)}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              width: Math.min(width - 32, 400),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="lightning-bolt-circle"
              size={40}
              color={theme.colors.primary}
            />
            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
              Reclaim Premium
            </Text>
            {featureDescription ? (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}
              >
                {featureDescription}
              </Text>
            ) : null}
          </View>

          {/* Benefits */}
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.icon} style={styles.benefitRow}>
                <MaterialCommunityIcons
                  name={b.icon as any}
                  size={20}
                  color={theme.colors.primary}
                  style={{ marginRight: 10, marginTop: 1 }}
                />
                <Text
                  variant="bodySmall"
                  style={{ flex: 1, color: theme.colors.onSurface, lineHeight: 18 }}
                >
                  {b.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Error */}
          {error ? (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 8 }}
            >
              {error}
            </Text>
          ) : null}

          {/* CTA */}
          <Button
            mode="contained"
            loading={isLoading}
            disabled={isLoading || isPremium}
            onPress={handlePurchase}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            style={[primaryCapsule.style, styles.cta]}
            contentStyle={primaryCapsule.contentStyle}
            labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
            accessibilityLabel="Upgrade to Reclaim Premium"
          >
            {isPremium ? 'Already Premium' : 'Unlock Premium'}
          </Button>

          <View style={styles.footer}>
            <Button
              mode="text"
              onPress={handleRestore}
              disabled={isLoading}
              style={ghostCapsule.style}
              contentStyle={ghostCapsule.contentStyle}
              labelStyle={ghostCapsule.labelStyle}
              accessibilityLabel="Restore previous purchase"
            >
              Restore purchases
            </Button>
            <Button
              mode="text"
              onPress={onDismiss}
              style={ghostCapsule.style}
              contentStyle={ghostCapsule.contentStyle}
              labelStyle={ghostCapsule.labelStyle}
              accessibilityLabel="Close paywall"
            >
              Not now
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  benefits: {
    gap: 12,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cta: {
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
