import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { refreshSessionIfNeeded } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Session type from current supabase client
type SessionT = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

const Ctx = createContext<{ session: SessionT | null; loading: boolean }>({
  session: null,
  loading: true,
});

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionT | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial session + subscribe to auth state changes
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Get initial session
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setSession(data.session ?? null);
          setLoading(false);
        }

        // Refresh session if needed on startup
        if (data.session) {
          await refreshSessionIfNeeded();
        }
      } catch (error) {
        logger.error('Initial session load error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    // Subscribe to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (mounted) {
        setSession(s ?? null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Refresh session when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        logger.debug('App foregrounded, refreshing session if needed');
        await refreshSessionIfNeeded();
      }
    });

    return () => subscription?.remove();
  }, []);

  // Periodic session refresh (every 30 minutes)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (session) {
        logger.debug('Periodic session refresh check');
        await refreshSessionIfNeeded();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [session]);

  // Handle reclaim://auth#access_token=...&refresh_token=... deep links
  useEffect(() => {
    const applySessionFromUrl = async (incomingUrl: string | null) => {
      if (!incomingUrl) return;

      try {
        // Supabase mobile magic-link usually returns tokens in the URL hash
        const hash = incomingUrl.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        let access_token = params.get('access_token');
        let refresh_token = params.get('refresh_token');

        // Fallback: some providers may put them in the query string
        if (!access_token || !refresh_token) {
          const query = incomingUrl.split('?')[1] ?? '';
          const qp = new URLSearchParams(query);
          access_token = access_token ?? qp.get('access_token');
          refresh_token = refresh_token ?? qp.get('refresh_token');
        }

        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            logger.warn('setSession error:', error.message);
          } else {
            setSession(data.session ?? null);
          }
        } else {
          // Useful during debugging
          // console.warn('No tokens found in deep link:', incomingUrl);
        }
      } catch (e: any) {
        logger.warn('Deep link parse error:', e?.message ?? e);
      }
    };

    // Handle cold start (app launched by link)
    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) {
        await applySessionFromUrl(initial);
      }
    })();

    // Handle warm app (link received while running)
    const sub = Linking.addEventListener('url', async ({ url }) => {
      await applySessionFromUrl(url);
    });

    return () => sub.remove();
  }, []);

  return <Ctx.Provider value={{ session, loading }}>{children}</Ctx.Provider>;
}
