import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Image } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

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
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [appReady, setAppReady] = useState(false);
  const [hasOnboarded, setHasOnboardedState] = useState<boolean | null>(null);
  const [checkTrigger, setCheckTrigger] = useState(0);
  const [failsafeTriggered, setFailsafeTriggered] = useState(false);

  // Remote onboarding state: tri-state for timeout resilience v2
  const [remoteOnboarded, setRemoteOnboarded] = useState<true | false | null>(null); // null = unknown
  const [remoteStatus, setRemoteStatus] = useState<'idle' | 'checking' | 'known' | 'unknown'>('idle');

  const reduceMotion = useReducedMotion();
  const theme = useTheme();

  useEffect(() => {
    logger.debug(`[ENTRY_CHAIN] RootNavigator mounted`);
  }, []);

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
    (async () => {
      if (!userId) {
        setHasOnboardedState(false);
        setAppReady(true);
        setRemoteStatus('known');
        setRemoteOnboarded(false);
        if (__DEV__) logger.debug('[ONBOARD_V2] boot: no userId → hasOnboarded=false');
        return;
      }

      const local = await getHasOnboarded(userId);
      logger.debug('[ONBOARD_MONO] boot local=', local);

      // If local is true, set immediately (don't wait for remote)
      // This prevents flash of onboarding when user has already completed it
      if (local === true) {
        setHasOnboardedState(true);
        setAppReady(true);
        // Still trigger remote check for sync, but don't wait
        setCheckTrigger((c) => c + 1);
        return;
      }

      // If local is false or null, set state but wait for remote check
      setHasOnboardedState((prev) => (prev === true ? true : local));
      setAppReady(true);

      // kick remote check
      setCheckTrigger((c) => c + 1);
    })();
  }, [userId]);

  // PHASE B: remote sync
  useEffect(() => {
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
            const localVal = await getHasOnboarded(userId);
            const effective = localVal || remote === true;
            logger.debug('[ONBOARD_V2] local=', localVal, 'remote=', remote, 'status=known effective=', effective);
            
            // If remote is true, upgrade local state immediately
            if (remote === true) {
              setHasOnboardedState(true);
              try {
                if (!localVal) {
                  await markOnboardingComplete(userId);
                  logger.debug('[ONBOARD_V2] local upgraded → true (from remote)');
                }
              } catch {
                // non-critical
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
  }, [userId, checkTrigger, hasOnboarded]);

  const onFinishOnboarding = useCallback(async () => {
    logger.debug('[ONBOARD_MONO] onFinishOnboarding called');
    if (!userId) return;

    setHasOnboardedState(true);

    try {
      await markOnboardingComplete(userId);
    } catch (e) {
      logger.warn('[ONBOARD_MONO] markOnboardingComplete failed:', e);
    }

    setCheckTrigger((c) => c + 1);
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

  // Hold splash when:
  // - App not ready
  // - Onboarding state unknown
  // - Session exists AND local false AND remote unknown (don't show onboarding until remote resolves)
  // BUT: failsafe allows UI after 8s timeout
  const shouldHoldSplash =
    !appReady ||
    hasOnboarded === null ||
    (session && !localHasOnboarded && remoteOnboarded === null && !failsafeTriggered);

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
        <Image
          source={require('../../assets/splash.png')}
          style={{ width: 160, height: 160, resizeMode: 'contain', marginBottom: 16 }}
        />
        <ActivityIndicator color={theme.colors.primary} />
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
            <Stack.Screen name="App" component={AppNavigator} />
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
