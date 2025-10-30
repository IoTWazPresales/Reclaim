import React, { useEffect, useState } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@/providers/AuthProvider';
import AuthScreen from '@/screens/AuthScreen';
import TabsNavigator from '@/routing/TabsNavigator';
import OnboardingNavigator from '@/routing/OnboardingNavigator';
import { navRef } from '@/navigation/nav';

import { supabase } from '@/lib/supabase';
import { getHasOnboarded, setHasOnboarded } from '@/state/onboarding';
import type { RootStackParamList } from '@/navigation/types';

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
      Tabs: {
        screens: {
          Home: 'home',
          Meds: {
            screens: {
              MedsHome: 'meds',
              MedDetails: 'meds/:id',
            },
          },
          Mood: 'mood',
          Sleep: 'sleep',
          Mindfulness: 'mindfulness',
          Insights: 'insights',
        },
      },
    },
  },
};

export default function RootNavigator() {
  const { session } = useAuth();
  const [booting, setBooting] = useState(true);
  const [hasOnboarded, setHasOnboardedState] = useState(false);

  // Load onboarding flag whenever the user session changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!session?.user) {
          setHasOnboardedState(false);
          setBooting(false);
          return;
        }
        // Try server truth
        const { data, error } = await supabase
          .from('profiles')
          .select('has_onboarded')
          .eq('id', session.user.id)
          .maybeSingle();

        if (cancelled) return;

        if (!error && data) {
          const flag = !!data.has_onboarded;
          setHasOnboardedState(flag);
          await setHasOnboarded(flag); // sync local
        } else {
          // Fallback to local cache
          const local = await getHasOnboarded();
          setHasOnboardedState(local);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const navKey = session ? 'app' : 'auth';
  if (booting) return null;

  return (
    <NavigationContainer ref={navRef} linking={linking}>
      <Stack.Navigator key={navKey} screenOptions={{ headerShown: false, animation: 'fade' }}>
        {session ? (
          hasOnboarded ? (
            <Stack.Screen name="Tabs" component={TabsNavigator} />
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
