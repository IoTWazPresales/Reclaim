import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { getSession, refreshIfNeeded } from '@/lib/authSessionService';
import { logger } from '@/lib/logger';
import { ensureProfile } from '@/lib/api';

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
        const s = await getSession();

        if (mounted) {
          logger.debug('[AUTH_TRUTH] initial session=', s ? 'present' : 'null');
          setSession(s);
          setLoading(false);
        }

        if (s?.user && mounted) {
          refreshIfNeeded().catch((error) => {
            logger.error('Session refresh error (non-blocking):', error);
          });

          // Ensure profile row exists when session is established (non-blocking)
          ensureProfile().catch((error) => {
            logger.warn('ensureProfile error (non-blocking):', error);
          });
        }
      } catch (error) {
        logger.error('Initial session load error:', error);
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    })();

    // Subscribe to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      logger.debug('[AUTH_TRUTH] onAuthStateChange event=', event, 'session=', s ? 'present' : 'null');
      setSession(s ?? null);
      // Make sure we never get stuck "loading" if auth event is first thing to arrive
      setLoading(false);

      // Ensure profile row exists when user signs in (non-blocking)
      if (s?.user) {
        ensureProfile().catch((error) => {
          logger.warn('ensureProfile error on auth state change (non-blocking):', error);
        });
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
        try {
          await refreshIfNeeded();
        } catch (e) {
          logger.warn('Foreground refreshSessionIfNeeded failed (non-critical)');
        }
      }
    });

    return () => subscription?.remove();
  }, []);

  // Periodic session refresh (every 30 minutes)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (session) {
        logger.debug('Periodic session refresh check');
        try {
          await refreshIfNeeded();
        } catch (e) {
          logger.warn('Periodic refreshSessionIfNeeded failed (non-critical)');
        }
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);

  return <Ctx.Provider value={{ session, loading }}>{children}</Ctx.Provider>;
}
