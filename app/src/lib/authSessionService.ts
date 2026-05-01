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
const AUTH_DEEPLINK_TTL_MS = 5 * 60 * 1000;
const processedAuthDeepLinks = new Map<string, number>();

function normalizeParam(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

function cleanupProcessedAuthDeepLinks(nowMs: number): void {
  for (const [key, ts] of processedAuthDeepLinks.entries()) {
    if (nowMs - ts > AUTH_DEEPLINK_TTL_MS) {
      processedAuthDeepLinks.delete(key);
    }
  }
}

function buildAuthDeepLinkFingerprint(url: string, qp: Record<string, unknown>, hash: string): string {
  const code = normalizeParam(qp['code']);
  if (code) return `code:${code}`;
  const tokenHash = normalizeParam(qp['token_hash']) || normalizeParam(qp['token']);
  if (tokenHash) return `token_hash:${tokenHash}`;
  const accessTokenQ = normalizeParam(qp['access_token']);
  if (accessTokenQ) return `access_query:${accessTokenQ.slice(0, 24)}`;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const access = hashParams.get('access_token');
    if (access) return `access_hash:${access.slice(0, 24)}`;
  }
  return `url:${url}`;
}

function isPkceVerifierError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('code verifier') ||
    m.includes('both auth code and code verifier should be non-empty') ||
    m.includes('non-empty')
  );
}

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
    const qp = (parsed.queryParams ?? {}) as Record<string, unknown>;
    const hash = url.includes('#') ? url.split('#')[1] : '';
    const fingerprint = buildAuthDeepLinkFingerprint(url, qp, hash);
    const nowMs = Date.now();
    cleanupProcessedAuthDeepLinks(nowMs);
    const seenAt = processedAuthDeepLinks.get(fingerprint);
    if (seenAt && nowMs - seenAt < AUTH_DEEPLINK_TTL_MS) {
      logger.debug('[AUTH_TRUTH] Duplicate auth callback ignored', { fingerprint: fingerprint.slice(0, 32) });
      return;
    }

    // OAuth code
    const code = normalizeParam(qp['code']);
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const message = error.message ?? String(error);
        if (isPkceVerifierError(message)) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            processedAuthDeepLinks.set(fingerprint, nowMs);
            logger.debug('[AUTH_TRUTH] PKCE verifier missing but session is already active');
            return;
          }
          throw new Error('Authentication session expired. Please try signing in again.');
        }
        throw error;
      }
      processedAuthDeepLinks.set(fingerprint, nowMs);
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
        processedAuthDeepLinks.set(fingerprint, nowMs);
        logger.debug('[AUTH_TRUTH] setSession from hash');
        return;
      }
    }

    // Tokens in query params (fallback)
    const accessTokenQ = normalizeParam(qp['access_token']);
    const refreshTokenQ = normalizeParam(qp['refresh_token']);
    if (accessTokenQ && refreshTokenQ) {
      const { error } = await supabase.auth.setSession({
        access_token: accessTokenQ,
        refresh_token: refreshTokenQ,
      });
      if (error) throw error;
      processedAuthDeepLinks.set(fingerprint, nowMs);
      logger.debug('[AUTH_TRUTH] setSession from query');
      return;
    }

    // Magic link OTP (token_hash)
    const tokenHash = normalizeParam(qp['token_hash']) || normalizeParam(qp['token']);
    if (tokenHash) {
      const email = getLastEmail();
      if (!email) throw new Error('Missing cached email for verifyOtp.');
      const type = normalizeParam(qp['type']) || 'magiclink';
      const { error } = await supabase.auth.verifyOtp({
        type: type as any,
        email,
        token_hash: tokenHash,
      });
      if (error) throw error;
      processedAuthDeepLinks.set(fingerprint, nowMs);
      logger.debug('[AUTH_TRUTH] verifyOtp success');
      return;
    }

    logger.debug('[AUTH_TRUTH] no auth params in url');
  } catch (err: any) {
    logger.warn('[AUTH_TRUTH] setSessionFromDeepLink error=', err?.message ?? err);
    throw err;
  }
}
