/**
 * Centralized auth session handling. Encapsulates getSession, refreshIfNeeded,
 * and setSessionFromDeepLink. Used by AuthProvider and App.tsx DeepLinkAuthBridge.
 * OAuth callback parsing rules MUST remain identical; do not change URL matching or redirect formats.
 */

import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { refreshSessionIfNeeded } from '@/lib/auth';
import { getLastEmail } from '@/state/authCache';
import { logger } from '@/lib/logger';

type SessionT = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

export async function getSession(): Promise<SessionT> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function refreshIfNeeded(): Promise<void> {
  await refreshSessionIfNeeded();
}

/**
 * Process deep-link URL and set session. Parsing logic MUST match existing behavior.
 * Supports: OAuth code, tokens (hash/query), magic link token_hash.
 */
export async function setSessionFromDeepLink(url: string): Promise<void> {
  if (!url || typeof url !== 'string') return;

  try {
    logger.debug('[AUTH_TRUTH] setSessionFromDeepLink url=', url.substring(0, 120));

    const parsed = Linking.parse(url);
    const qp = parsed.queryParams ?? {};
    const hash = url.includes('#') ? url.split('#')[1] : '';

    // OAuth code
    const code = qp['code'] as string;
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      logger.debug('[AUTH_TRUTH] exchangeCodeForSession success session=', !!data?.session);
      return;
    }

    // Tokens in hash
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        logger.debug('[AUTH_TRUTH] setSession from hash');
        return;
      }
    }

    // Tokens in query params (fallback)
    const accessTokenQ = qp['access_token'] as string;
    const refreshTokenQ = qp['refresh_token'] as string;
    if (accessTokenQ && refreshTokenQ) {
      const { error } = await supabase.auth.setSession({
        access_token: accessTokenQ,
        refresh_token: refreshTokenQ,
      });
      if (error) throw error;
      logger.debug('[AUTH_TRUTH] setSession from query');
      return;
    }

    // Magic link OTP (token_hash)
    const tokenHash = (qp['token_hash'] as string) || (qp['token'] as string);
    if (tokenHash) {
      const email = getLastEmail();
      if (!email) throw new Error('Missing cached email for verifyOtp.');
      const type = (qp['type'] as string) || 'magiclink';
      const { error } = await supabase.auth.verifyOtp({
        type: type as any,
        email,
        token_hash: tokenHash,
      });
      if (error) throw error;
      logger.debug('[AUTH_TRUTH] verifyOtp success');
      return;
    }

    logger.debug('[AUTH_TRUTH] no auth params in url');
  } catch (err: any) {
    logger.warn('[AUTH_TRUTH] setSessionFromDeepLink error=', err?.message ?? err);
    throw err;
  }
}
