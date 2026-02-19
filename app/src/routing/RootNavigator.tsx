import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { useAuth } from '@/providers/AuthProvider';
import AuthScreen from '@/screens/AuthScreen';
import AppNavigator from '@/routing/AppNavigator';
import OnboardingNavigator from '@/routing/OnboardingNavigator';
import { navRef } from '@/navigation/nav';
import { logger } from '@/lib/logger';

import { supabase } from '@/lib/supabase';
import { getHasOnboarded } from '@/state/onboarding';
import { markOnboardingComplete } from '@/lib/onboardingService';
import type { RootStackParamList } from '@/navigation/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ReclaimLogo } from '@/components/ReclaimLogo';
import { HealthDisclaimerModal } from '@/components/HealthDisclaimerModal';
import { requestHealthSync } from '@/sync/SyncCoordinator';


const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['reclaim://'],
  config: {
    screens: {
      Auth: 'auth',
      Onboarding: { path: 'onboarding' },
      App: {
        screens: {
          HomeTabs: {
            screens: {
              Home: 'home',
              Analytics: 'analytics',
              Settings: 'settings',
            },
          },
          Sleep: 'sleep',
          Mood: 'mood',
          Meds: {
            screens: {
              MedsHome: 'meds',
              MedDetails: 'meds/:id',
            },
          },
          Training: 'training',
          Mindfulness: 'mindfulness',
          Meditation: 'meditation',
          Integrations: 'integrations',
          Notifications: 'notifications',
          About: 'about',
          DataPrivacy: 'privacy',
          EvidenceNotes: 'evidence-notes',
          ReclaimMoments: 'moments',
        },
      },
    },
  },
};

export default function RootNavigator() {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;

  const [appReady, setAppReady] = useState(false);
  const [hasOnboarded, setHasOnboardedState] = useState<boolean | null>(null);
  const [bootstrappedUserId, setBootstrappedUserId] = useState<string | null>(null);
  const [checkTrigger, setCheckTrigger] = useState(0);
  const [failsafeTriggered, setFailsafeTriggered] = useState(false);

  // Remote onboarding state: tri-state for timeout resilience v2
  const [remoteOnboarded, setRemoteOnboarded] = useState<true | false | null>(null); // null = unknown
  const [remoteStatus, setRemoteStatus] = useState<'idle' | 'checking' | 'known' | 'unknown'>('idle');
  const [startupSyncState, setStartupSyncState] = useState<'idle' | 'running' | 'done'>('idle');
  const startupSyncUserRef = useRef<string | null>(null);
  const startupSyncStartedRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);

  const reduceMotion = useReducedMotion();
  const theme = useTheme();

  useEffect(() => {
    logger.debug(`[ENTRY_CHAIN] RootNavigator mounted`);
  }, []);

  // Prevent auth handoff flashes:
  // when user changes from signed-out -> signed-in (or switches accounts),
  // force onboarding/auth bootstrap back to unknown/loading before routing.
  useEffect(() => {
    if (previousUserIdRef.current === userId) return;
    previousUserIdRef.current = userId;

    setFailsafeTriggered(false);
    if (userId) {
      setAppReady(false);
      setHasOnboardedState(null);
      setRemoteOnboarded(null);
      setRemoteStatus('idle');
      startupSyncStartedRef.current = false;
      setStartupSyncState('idle');
    }
  }, [userId]);

  // Failsafe timeout: if remote remains unknown for >8 seconds, allow onboarding UI to show
  useEffect(() => {
    if (!userId || hasOnboarded === true || failsafeTriggered) return;
    
    if (remoteStatus === 'checking' || (remoteStatus === 'unknown' && remoteOnboarded === null)) {
      const timeoutId = setTimeout(() => {
        logger.debug('[ONBOARD_FAILSAFE] Timeout after 8s - remote still unknown, allowing onboarding UI');
        setFailsafeTriggered(true);
        // Don't set remoteOnboarded to false (preserve unknown state for retry)
        // Just allow UI to proceed
      }, 8000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [userId, remoteStatus, remoteOnboarded, hasOnboarded, failsafeTriggered]);

  // PHASE A: local boot
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!userId) {
          if (!cancelled) { setHasOnboardedState(false); setAppReady(true); setRemoteStatus('known'); setRemoteOnboarded(false); setBootstrappedUserId(null); }
          if (__DEV__) logger.debug('[ONBOARD_V2] boot: no userId → hasOnboarded=false');
          return;
        }

        const local = await getHasOnboarded(userId);
        if (cancelled) return;
        logger.debug('[ONBOARD_MONO] boot local=', local);

        // If local is true, set immediately (don't wait for remote)
        // This prevents flash of onboarding when user has already completed it
        if (local === true) {
          if (!cancelled) { setHasOnboardedState(true); setAppReady(true); setBootstrappedUserId(userId); }
          // Still trigger remote check for sync, but don't wait
          setCheckTrigger((c) => c + 1);
          return;
        }

        // If local is false or null, set state but wait for remote check
        setHasOnboardedState((prev) => (prev === true ? true : local));
        setAppReady(true);
        setBootstrappedUserId(userId);

        // kick remote check
        setCheckTrigger((c) => c + 1);
      } catch (error) {
        logger.warn('[ONBOARD_V2] local boot failed, using safe fallback', error);
        if (userId) {
          setHasOnboardedState(false);
          setAppReady(true);
          setBootstrappedUserId(userId);
          setCheckTrigger((c) => c + 1);
        } else {
          setHasOnboardedState(false);
          setAppReady(true);
          setBootstrappedUserId(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // PHASE B: remote sync
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) return;

      if (hasOnboarded === true) {
        if (__DEV__) logger.debug('[ONBOARD_V2] remote sync skipped (already true)');
        setRemoteStatus('known');
        setRemoteOnboarded(true);
        return;
      }

      setRemoteStatus('checking');
      let remote: boolean | null = null;
      let retryCount = 0;
      const maxRetries = 2;
      
      // Retry logic: if timeout, retry once before giving up
      while (retryCount <= maxRetries && remote === null) {
        try {
          const { data, error } = (await Promise.race([
            supabase.from('profiles').select('has_onboarded').eq('id', userId).maybeSingle(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
          ])) as any;

          if (!error && data) {
            // Server returned explicit value (true or false)
            remote = data.has_onboarded === true;
            setRemoteStatus('known');
            setRemoteOnboarded(remote);
            if (cancelled) return;

            const localVal = await getHasOnboarded(userId);
            if (cancelled) return;

            logger.debug('[ONBOARD_V2] local=', localVal, 'remote=', remote, 'failsafe=', failsafeTriggered);

            if (remote === true) {
              // Always upgrade the local SecureStore so next cold-start is fast.
              try {
                if (!localVal) {
                  await markOnboardingComplete(userId);
                  logger.debug('[ONBOARD_V2] local upgraded → true (from remote)');
                }
              } catch {
                // non-critical
              }

              // Only flip hasOnboarded (which changes flowKey / remounts the navigator)
              // if the failsafe has NOT triggered. When failsafe is active the user may
              // already be navigating inside the onboarding stack; changing flowKey here
              // would reset their position back to WelcomeScreen.
              // effectiveHasOnboarded (which includes remoteOnboarded) handles routing
              // transparently via the JSX without a full navigator remount.
              if (!failsafeTriggered) {
                setHasOnboardedState(true);
              }
            }

            break; // Success, exit retry loop
          } else {
            logger.debug('[ONBOARD_V2] remote error=', error?.message || 'timeout');
            if (retryCount < maxRetries) {
              retryCount++;
              // Wait 500ms before retry
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              // After max retries, check local flag as fallback
              // If local says true, trust it (user completed onboarding)
              const local = await getHasOnboarded(userId);
              if (local === true) {
                remote = true; // Trust local if remote fails
                setRemoteStatus('known');
                setRemoteOnboarded(true);
                logger.debug('[ONBOARD_V2] remote failed, trusting local=true');
              } else {
                // Remote unknown after retries → mark as unknown (don't set to false)
                setRemoteStatus('unknown');
                setRemoteOnboarded(null);
                logger.debug('[ONBOARD_V2] local=', local, 'remote=null status=unknown effective=', local);
              }
            }
          }
        } catch (err) {
          logger.debug('[ONBOARD_V2] remote exception=', err instanceof Error ? err.message : 'unknown');
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            // After max retries, check local flag as fallback
            const local = await getHasOnboarded(userId);
            if (local === true) {
              remote = true;
              setRemoteStatus('known');
              setRemoteOnboarded(true);
              logger.debug('[ONBOARD_V2] remote exception after retries, trusting local=true');
            } else {
              // Remote unknown after retries → mark as unknown
              setRemoteStatus('unknown');
              setRemoteOnboarded(null);
              logger.debug('[ONBOARD_V2] local=', local, 'remote=null status=unknown effective=', local);
            }
          }
        }
      }
      
      // Handle remote result (only for cases not handled in loop)
      // If remote resolved successfully in loop, remoteStatus is already 'known' and state is set
      // This section handles cases where remote is false or null after retries
      if (remote === false && remoteStatus !== 'known') {
        // Remote explicitly false → allow onboarding to show
        setRemoteStatus('known');
        setRemoteOnboarded(false);
        // Don't override local true if it exists
        const local = await getHasOnboarded(userId);
        if (local === true) {
          setHasOnboardedState(true);
          logger.debug('[ONBOARD_V2] remote=false but local=true → set to true');
        } else {
          logger.debug('[ONBOARD_V2] remote=false → allow onboarding');
        }
      } else if (remote === null && remoteStatus === 'unknown') {
        // remote === null (unknown) → keep splash, don't show onboarding yet
        // Trust local flag if it exists
        const local = await getHasOnboarded(userId);
        if (local === true) {
          setHasOnboardedState(true);
          logger.debug('[ONBOARD_V2] remote=null but local=true → set to true');
        } else {
          logger.debug('[ONBOARD_V2] remote=null → keep splash (unknown)');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId, checkTrigger, hasOnboarded]);

  const onFinishOnboarding = useCallback(async () => {
    logger.debug('[ONBOARD_MONO] onFinishOnboarding called');
    // Set state FIRST — do not gate on userId. The user explicitly completed
    // onboarding; we must always transition to App regardless of auth state.
    setHasOnboardedState(true);

    if (userId) {
      try {
        await markOnboardingComplete(userId);
      } catch (e) {
        logger.warn('[ONBOARD_MONO] markOnboardingComplete failed:', e);
      }
      setCheckTrigger((c) => c + 1);
    }
  }, [userId]);

  useEffect(() => {
    (globalThis as any).__refreshOnboarding = async () => {
      if (!userId) return;

      try {
        const local = await getHasOnboarded(userId);
        setHasOnboardedState((prev) => (prev === true ? true : local));
        logger.debug('[ONBOARD_MONO] __refreshOnboarding local=', local);
      } catch {}

      setRemoteStatus('idle');
      setRemoteOnboarded(null);
      setCheckTrigger((prev) => prev + 1);
    };

    return () => {
      delete (globalThis as any).__refreshOnboarding;
    };
  }, [userId]);

  const navKey = session ? 'app' : 'auth';

  // ✅ CRITICAL: force stack remount when onboarding state flips (fixes “tap to unstick”)
  const flowKey = `${navKey}:${session ? (hasOnboarded ? 'ON' : 'OFF') : 'NA'}`;

  // Compute effective onboarding: monotonic (local || remote === true)
  const localHasOnboarded = hasOnboarded === true; // Component state reflects local truth
  const effectiveHasOnboarded = localHasOnboarded || remoteOnboarded === true;

  useEffect(() => {
    if (!userId) {
      startupSyncUserRef.current = null;
      startupSyncStartedRef.current = false;
      setStartupSyncState('idle');
      return;
    }
    if (startupSyncUserRef.current !== userId) {
      startupSyncUserRef.current = userId;
      startupSyncStartedRef.current = false;
      setStartupSyncState('idle');
    }
  }, [userId]);

  // Dedicated startup loading gate after auth+onboarding:
  // run a short bootstrap sync before mounting dashboard flow.
  useEffect(() => {
    if (!session || !effectiveHasOnboarded) return;
    if (startupSyncStartedRef.current) return;

    startupSyncStartedRef.current = true;
    setStartupSyncState('running');
    let disposed = false;

    (async () => {
      try {
        await Promise.race([
          requestHealthSync({ reason: 'startup_gate' }).catch((error) => {
            logger.warn('[STARTUP_SYNC] syncHealthData failed (non-blocking):', error);
          }),
          new Promise((resolve) => setTimeout(resolve, 6000)),
        ]);
      } finally {
        if (!disposed) setStartupSyncState('done');
      }
    })();

    return () => {
      disposed = true;
    };
  }, [session, effectiveHasOnboarded]);

  // Hard failsafe: never allow startup sync gate to block forever.
  useEffect(() => {
    if (startupSyncState !== 'running') return;
    const timeout = setTimeout(() => {
      logger.warn('[STARTUP_SYNC] Failsafe released startup loading gate');
      setStartupSyncState('done');
    }, 12000);
    return () => clearTimeout(timeout);
  }, [startupSyncState]);

  // Hold splash when:
  // - App not ready
  // - Onboarding state unknown
  // - Session exists AND local false AND remote unknown (don't show onboarding until remote resolves)
  // BUT: failsafe allows UI after 8s timeout
  const shouldHoldSplash =
    authLoading ||
    !appReady ||
    hasOnboarded === null ||
    (session && bootstrappedUserId !== userId) ||
    (session && !localHasOnboarded && remoteOnboarded === null && !failsafeTriggered) ||
    // Startup-sync gate: only hold if the user was already confirmed onboarded from
    // local SecureStore on cold start. If we only know via remote check (e.g. failsafe
    // path) don't block — the user just completed onboarding and shouldn't wait 6s.
    (session && localHasOnboarded && startupSyncState !== 'done');

  const splashMessage = authLoading
    ? 'Checking sign-in...'
    : session && effectiveHasOnboarded && startupSyncState !== 'done'
      ? 'Preparing your dashboard...'
      : 'Loading...';

  if (shouldHoldSplash) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ marginBottom: 16 }}>
          <ReclaimLogo size={224} />
        </View>
        <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>{splashMessage}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef} linking={linking}>
      <Stack.Navigator
        key={flowKey}
        screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}
      >
        {session ? (
          effectiveHasOnboarded ? (
            <Stack.Screen name="App">
              {() => (
                <View style={{ flex: 1 }}>
                  <AppNavigator />
                  <HealthDisclaimerModal />
                </View>
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Onboarding">
              {() => <OnboardingNavigator onFinish={onFinishOnboarding} />}
            </Stack.Screen>
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
