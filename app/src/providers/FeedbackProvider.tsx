import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, View } from 'react-native';
import { ReportIssueButton } from '@/components/feedback/ReportIssueButton';
import { ReportIssueModal } from '@/components/feedback/ReportIssueModal';
import { createAlphaFeedbackReport } from '@/lib/api';
import { isFeedbackCaptureEnabled } from '@/lib/feedback/flags';
import { hashFeedbackState } from '@/lib/feedback/hash';
import { enqueueFeedback, flushFeedbackQueue } from '@/lib/feedback/queue';
import { sanitizeFeedbackContext } from '@/lib/feedback/sanitize';
import type { FeedbackScopeInput } from '@/lib/feedback/types';
import { logger } from '@/lib/logger';
import { navRef } from '@/navigation/nav';
import { getAppVersionInfo } from '@/hooks/useAppUpdates';
import { Platform } from 'react-native';

type FeedbackContextValue = {
  enabled: boolean;
  openReporter: (scope: FeedbackScopeInput) => void;
  reportScreenIssue: (snapshot?: FeedbackScopeInput['snapshot']) => void;
  registerScreenSnapshot: (getter: (() => Record<string, unknown>) | null) => void;
};

const FeedbackContext = createContext<FeedbackContextValue>({
  enabled: false,
  openReporter: () => {},
  reportScreenIssue: () => {},
  registerScreenSnapshot: () => {},
});

function getActiveRouteName(): string | null {
  if (!navRef.isReady()) return null;
  try {
    const state = navRef.getRootState() as any;
    if (!state?.routes?.length) return null;
    let route = state.routes[state.index ?? 0];
    while (route?.state?.routes?.length) {
      route = route.state.routes[route.state.index ?? 0];
    }
    return route?.name ?? null;
  } catch {
    return null;
  }
}

function resolveSnapshot(scope: FeedbackScopeInput | null): Record<string, unknown> {
  if (!scope?.snapshot) return {};
  try {
    const raw = typeof scope.snapshot === 'function' ? scope.snapshot() : scope.snapshot;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw as Record<string, unknown>;
  } catch (error) {
    logger.warn('[feedback] snapshot resolver failed', error);
    return {};
  }
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const enabled = isFeedbackCaptureEnabled();
  const [routeName, setRouteName] = useState<string | null>(null);
  const [scope, setScope] = useState<FeedbackScopeInput | null>(null);
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const screenSnapshotRef = useRef<(() => Record<string, unknown>) | null>(null);

  const refreshRoute = useCallback(() => {
    setRouteName(getActiveRouteName());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refreshRoute();
    const unsub = navRef.addListener?.('state', refreshRoute);
    return () => {
      unsub?.();
    };
  }, [enabled, refreshRoute]);

  const flushQueued = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await flushFeedbackQueue(createAlphaFeedbackReport);
      if (result.flushed > 0) {
        logger.debug('[feedback] flushed queued reports', result);
      }
    } catch (error) {
      logger.debug('[feedback] queue flush skipped', error);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    flushQueued().catch(() => {});
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        refreshRoute();
        flushQueued().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [enabled, flushQueued, refreshRoute]);

  const openReporter = useCallback(
    (nextScope: FeedbackScopeInput) => {
      if (!enabled) return;
      refreshRoute();
      setScope(nextScope);
      setVisible(true);
    },
    [enabled, refreshRoute],
  );

  const reportScreenIssue = useCallback(
    (snapshot?: FeedbackScopeInput['snapshot']) => {
      const effectiveSnapshot = snapshot ?? screenSnapshotRef.current ?? undefined;
      openReporter({
        scopeType: 'screen',
        componentKey: routeName ? `screen:${routeName}` : 'screen:unknown',
        componentTitle: routeName ?? 'Current screen',
        snapshot: effectiveSnapshot,
      });
    },
    [openReporter, routeName],
  );

  const registerScreenSnapshot = useCallback((getter: (() => Record<string, unknown>) | null) => {
    screenSnapshotRef.current = getter;
  }, []);

  const handleSubmit = useCallback(
    async ({
      category,
      severity,
      note,
    }: {
      category: 'visual' | 'copy' | 'wrong_data' | 'duplicate_message' | 'performance' | 'other';
      severity: 'minor' | 'major' | 'critical';
      note: string;
    }) => {
      if (!scope) return;
      setSubmitting(true);

      const app = getAppVersionInfo();
      const activeRoute = getActiveRouteName();
      const rawContext = resolveSnapshot(scope);
      const context = sanitizeFeedbackContext({
        routeName: activeRoute,
        scopeType: scope.scopeType,
        componentKey: scope.componentKey,
        componentTitle: scope.componentTitle ?? null,
        tags: scope.tags ?? [],
        snapshot: rawContext,
      });
      const stateHash = hashFeedbackState({
        routeName: activeRoute,
        componentKey: scope.componentKey,
        category,
        note,
        context,
      });

      const payload = {
        routeName: activeRoute,
        scope,
        category,
        severity,
        note,
        context,
        stateHash,
        metadata: {
          appVersion: String(app.version),
          buildNumber: app.buildNumber,
          runtimeVersion: app.runtimeVersion ?? null,
          channel: app.channel ?? null,
          platform: Platform.OS,
          osVersion: String(Platform.Version),
        },
      } as const;

      try {
        await createAlphaFeedbackReport(payload);
        setVisible(false);
        setScope(null);
        Alert.alert('Sent', 'Report captured. Thank you for the detailed feedback.');
        flushQueued().catch(() => {});
      } catch (error) {
        await enqueueFeedback(payload);
        setVisible(false);
        setScope(null);
        Alert.alert(
          'Queued offline',
          'Could not send right now. Report has been queued and will retry automatically.',
        );
        logger.warn('[feedback] queued report due to submit failure', error);
      } finally {
        setSubmitting(false);
      }
    },
    [scope, flushQueued],
  );

  const value = useMemo(
    () => ({
      enabled,
      openReporter,
      reportScreenIssue,
      registerScreenSnapshot,
    }),
    [enabled, openReporter, reportScreenIssue, registerScreenSnapshot],
  );

  const shouldShowGlobalButton =
    enabled &&
    routeName !== 'Auth' &&
    routeName !== 'Onboarding' &&
    routeName !== null;

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {shouldShowGlobalButton ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', right: 14, bottom: 96, zIndex: 50 }}>
          <ReportIssueButton
            accessibilityLabel="Report issue on current screen"
            onPress={() => reportScreenIssue()}
            size={18}
          />
        </View>
      ) : null}
      <ReportIssueModal
        visible={visible}
        routeName={routeName}
        scope={scope}
        submitting={submitting}
        onDismiss={() => {
          if (submitting) return;
          setVisible(false);
          setScope(null);
        }}
        onSubmit={handleSubmit}
      />
    </FeedbackContext.Provider>
  );
}

export function useFeedbackContext(): FeedbackContextValue {
  return useContext(FeedbackContext);
}
