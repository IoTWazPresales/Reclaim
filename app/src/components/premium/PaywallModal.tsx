/**
 * PaywallModal — transformation-led premium pitch (Phase 3.2).
 *
 * Headline focuses on outcome, not feature bullets. Trial + annual anchor
 * copy is hydrated from live RevenueCat offerings when available.
 */

import React, { useCallback, useMemo } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePremium } from '@/lib/premium/usePremium';
import { useAppTheme, RECLAIM_CHROME, reclaimChromeElevation, reclaimGlassWash } from '@/theme';
import { reclaimGhostCapsuleButton, reclaimPrimaryCapsuleButton } from '@/theme/reclaimVisualLanguage';
import { PaywallPremiumBackdrop } from '@/components/premium/PaywallPremiumBackdrop';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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
  const sheetChrome = useMemo(() => reclaimChromeElevation(appTheme, 'sheet'), [appTheme]);
  const glassWash = useMemo(() => reclaimGlassWash(appTheme), [appTheme]);
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { isPremium, isLoading, error, offering, purchasePremium, restorePurchases } = usePremium();

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

  const enteringOverlay = reduceMotion ? undefined : FadeIn.duration(250);
  const enteringCard = reduceMotion ? undefined : SlideInDown.duration(450).springify().damping(16);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View
        entering={enteringOverlay}
        style={[styles.overlay, { backgroundColor: theme.colors.backdrop ?? 'rgba(0,0,0,0.72)' }]}
      >
        <PaywallPremiumBackdrop width={width} height={height} accent={theme.colors.primary} />

        <Animated.View
          entering={enteringCard}
          style={[
            styles.card,
            glassWash,
            sheetChrome,
            {
              borderRadius: RECLAIM_CHROME.sheetRadius,
              width: Math.min(width - 32, 400),
            },
          ]}
        >
          <View style={styles.header}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.dark ? 'rgba(83, 201, 202, 0.14)' : 'rgba(83, 201, 202, 0.12)',
                borderWidth: 1,
                borderColor: theme.dark ? 'rgba(83, 201, 202, 0.28)' : 'rgba(83, 201, 202, 0.2)',
              }}
            >
              <MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={30} color={theme.colors.primary} />
            </View>

            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
              Understand what your body is trying to tell you
            </Text>

            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, lineHeight: 22 }}
            >
              Premium turns scattered sleep, mood, and med signals into a calm, personalised read — so you know what to
              do next, not just what happened.
            </Text>

            {featureDescription ? (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.primary, textAlign: 'center', marginTop: 10, fontWeight: '600' }}
              >
                {featureDescription}
              </Text>
            ) : null}
          </View>

          <View style={styles.pricingBlock}>
            {offering.trialLine ? (
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', textAlign: 'center' }}>
                {offering.trialLine}
              </Text>
            ) : null}
            {offering.anchorLine ? (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 6 }}
              >
                {offering.anchorLine}
              </Text>
            ) : null}
            {offering.priceLine ? (
              <Text variant="labelMedium" style={{ color: theme.colors.primary, textAlign: 'center', marginTop: 4 }}>
                {offering.priceLine}
              </Text>
            ) : null}
          </View>

          <Text variant="bodySmall" style={styles.trustLine}>
            Cancel anytime. Your health data stays on your device — we never sell it.
          </Text>

          {error ? (
            <Text variant="labelSmall" style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 8 }}>
              {error}
            </Text>
          ) : null}

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
            {isPremium ? 'Already Premium' : offering.ctaLabel}
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
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: -0.2,
  },
  pricingBlock: {
    marginBottom: 12,
    paddingVertical: 10,
  },
  trustLine: {
    opacity: 0.72,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
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
