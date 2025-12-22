import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Image } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

import { useAuth } from '@/providers/AuthProvider';
import AuthScreen from '@/screens/AuthScreen';
import AppNavigator from '@/routing/AppNavigator';
import OnboardingNavigator from '@/routing/OnboardingNavigator';
import { navRef } from '@/navigation/nav';

import { supabase } from '@/lib/supabase';
import { getHasOnboarded, setHasOnboarded } from '@/state/onboarding';
import type { RootStackParamList } from '@/navigation/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep-linking: map reclaim:// URLs to tab + nested stack routes
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['reclaim://'],
  config: {
    screens: {
      Auth: 'auth',
      Onboarding: {
        path: 'onboarding',
      },
      App: {
        screens: {
          HomeTabs: {
            screens: {
              Home: 'home',
              Sleep: 'sleep',
              Mood: 'mood',
              Analytics: 'analytics',
              Settings: 'settings',
            },
          },
          Meds: {
            screens: {
              MedsHome: 'meds',
              MedDetails: 'meds/:id',
            },
          },
          Mindfulness: 'mindfulness',
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
  const [booting, setBooting] = useState(true);
  // Initialize from local storage immediately to prevent flash
  const [hasOnboarded, setHasOnboardedState] = useState<boolean | null>(null);
  const [checkTrigger, setCheckTrigger] = useState(0); // Force re-check trigger
  const reduceMotion = useReducedMotion();
  const theme = useTheme();

  // Initialize from local storage immediately
  useEffect(() => {
    (async () => {
      if (!userId) {
        setHasOnboardedState(false);
        return;
      }
      const local = await getHasOnboarded(userId);
      setHasOnboardedState(local);
    })();
  }, [userId]);

  // Function to check onboarding status
  const checkOnboarding = useCallback(async () => {
    try {
      if (!userId) {
        setHasOnboardedState(false);
        setBooting(false);
        return;
      }
      
      // Try server truth first with timeout
      const queryPromise = supabase
        .from('profiles')
        .select('has_onboarded')
        .eq('id', userId)
        .maybeSingle();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      );
      
      let data, error;
      try {
        const result = await Promise.race([queryPromise, timeoutPromise]) as any;
        data = result?.data;
        error = result?.error;
      } catch (timeoutError) {
        console.warn('RootNavigator: Supabase query timeout, using local cache');
        error = timeoutError;
      }

      if (!error && data) {
        const flag = !!data.has_onboarded;
        setHasOnboardedState(flag);
        await setHasOnboarded(userId, flag); // sync local
      } else {
        // Fallback to local cache
        const local = await getHasOnboarded(userId);
        setHasOnboardedState(local);
      }

    } catch (err) {
      console.error('RootNavigator: checkOnboarding error:', err);
      // Fallback to local cache on error
      const local = userId ? await getHasOnboarded(userId) : false;
      setHasOnboardedState(local);
    } finally {
      setBooting(false);
    }
  }, [userId]);

  // Load onboarding flag whenever the user session changes or checkTrigger changes
  useEffect(() => {
    if (!userId) {
      setBooting(false);
      return;
    }

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    (async () => {
      // Add timeout to prevent hanging - shorter timeout for faster UX
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          console.warn('RootNavigator: Supabase query timeout, using local cache');
          getHasOnboarded(userId).then(local => {
            if (!cancelled) {
              setHasOnboardedState(local);
              setBooting(false);
            }
          });
        }
      }, 3000); // 3 second timeout

      try {
        await checkOnboarding();
        if (!cancelled) {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        if (!cancelled) {
          clearTimeout(timeoutId);
          console.error('RootNavigator: onboarding check error:', error);
          const local = await getHasOnboarded(userId);
          setHasOnboardedState(local);
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [userId, checkTrigger, checkOnboarding]);

  // Expose refresh function globally so PermissionsScreen can trigger it
  useEffect(() => {
    // Store refresh function on global object for PermissionsScreen to call
    (globalThis as any).__refreshOnboarding = () => {
      setCheckTrigger((prev) => prev + 1);
    };
    return () => {
      delete (globalThis as any).__refreshOnboarding;
    };
  }, []);

  const navKey = session ? 'app' : 'auth';
  // Wait for initial local storage/server check before rendering; show a simple branded flash instead of a blank screen.
  if (booting || hasOnboarded === null) {
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
        key={navKey}
        screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}
      >
        {session ? (
          hasOnboarded ? (
            <Stack.Screen name="App" component={AppNavigator} />
          ) : (
            <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
