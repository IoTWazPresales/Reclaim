import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { refreshSessionIfNeeded } from '@/lib/auth';
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
        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session load timeout')), 5000)
        );

        let resp: Awaited<ReturnType<typeof supabase.auth.getSession>> | null = null;

        try {
          resp = (await Promise.race([sessionPromise, timeoutPromise])) as any;
        } catch (timeoutError) {
          logger.warn('AuthProvider: Session load timeout, using null session');
          if (mounted) {
            setSession(null);
            setLoading(false);
          }
          return;
        }

        const s = resp?.data?.session ?? null;

        if (mounted) {
          setSession(s);
          setLoading(false);
        }

        // Refresh session if needed on startup (non-blocking)
        if (s?.user && mounted) {
          refreshSessionIfNeeded().catch((error) => {
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

      logger.debug('[AUTH_SSN] event=' + event + ' session=' + (s ? 'present' : 'null'));
      setSession(s ?? null);
      setLoading(false);

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
        logger.debug('App foregrounded, refreshing session if needed');
        try {
          await refreshSessionIfNeeded();
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
          await refreshSessionIfNeeded();
        } catch (e) {
          logger.warn('Periodic refreshSessionIfNeeded failed (non-critical)');
        }
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);

  return <Ctx.Provider value={{ session, loading }}>{children}</Ctx.Provider>;
}
