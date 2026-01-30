/**
 * Centralized auth callback handling for OAuth and token deep links.
 * Used by DeepLinkAuthBridge (Linking) and AuthScreen (WebBrowser result).
 * Ignores dev-client bootstrap links; only processes canonical auth callbacks.
 */

import * as Linking from 'expo-linking';
import { supabase, hasPKCEVerifier } from '@/lib/supabase';
import { getLastEmail } from '@/state/authCache';
import { logger } from '@/lib/logger';

export function isDevClientBootstrap(url: string): boolean {
  return typeof url === 'string' && url.includes('://expo-development-client');
}

/**
 * If url is expo-development-client with nested url param, decode it.
 * Returns the nested URL when it contains auth params (code=, access_token=), else null.
 * The dev client can wrap the OAuth callback in the nested param instead of passing it directly.
 */
export function unwrapDevClientNestedUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('://expo-development-client')) return null;
  try {
    const u = new URL(url);
    const nested = u.searchParams.get('url');
    if (!nested) return null;
    const decoded = decodeURIComponent(nested);
    if (decoded && isAuthCallback(decoded)) return decoded;
    return null;
  } catch {
    return null;
  }
}

export function isAuthCallback(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const s = url.trim();
  if (!s) return false;
  try {
    const parsed = new URL(s);
    if (parsed.protocol !== 'reclaim:') return false;
    if (parsed.host !== 'auth') return false;
    if (!parsed.pathname || !parsed.pathname.startsWith('/callback')) return false;
    return true;
  } catch {
    return false;
  }
}

async function parseCodeFromUrl(url: string): Promise<string | null> {
  try {
    const parsed = Linking.parse(url);
    const qp = parsed.queryParams ?? {};
    return (qp['code'] as string) ?? null;
  } catch {
    const m = url.match(/[?&]code=([^&]+)/);
    return m ? m[1] : null;
  }
}

async function parseTokensFromUrl(url: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const hash = url.includes('#') ? url.split('#')[1] : '';
    const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
    const hashParams = hash ? new URLSearchParams(hash) : null;
    const queryParams = query ? new URLSearchParams(query) : null;
    const accessToken = hashParams?.get('access_token') ?? queryParams?.get('access_token') ?? null;
    const refreshToken = hashParams?.get('refresh_token') ?? queryParams?.get('refresh_token') ?? null;
    if (accessToken && refreshToken) return { accessToken, refreshToken };
    return null;
  } catch {
    return null;
  }
}

async function parseTokenHashFromUrl(url: string): Promise<{ tokenHash: string; type: string } | null> {
  try {
    const parsed = Linking.parse(url);
    const qp = parsed.queryParams ?? {};
    const tokenHash = (qp['token_hash'] as string) || (qp['token'] as string) || null;
    const type = (qp['type'] as string) || 'magiclink';
    if (tokenHash) return { tokenHash, type };
    return null;
  } catch {
    return null;
  }
}

/**
 * Process an auth callback URL: exchange code for session, or set session from tokens, or verify OTP.
 * Logs [AUTH_CB] for all outcomes.
 */
export async function processAuthCallback(url: string): Promise<void> {
  if (!url || !isAuthCallback(url)) return;

  logger.debug('[AUTH_CB] processing url=' + url.substring(0, 120) + (url.length > 120 ? '...' : ''));

  const code = await parseCodeFromUrl(url);
  if (code) {
    const { present, length } = await hasPKCEVerifier();
    if (!present) {
      logger.warn('[AUTH_CB] exchange skipped: PKCE verifier missing (not signing out)');
      return;
    }
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        logger.warn('[AUTH_CB] exchangeCodeForSession error=' + (error.message ?? ''));
        return;
      }
      logger.debug('[AUTH_CB] exchangeCodeForSession success userId=' + (data?.session?.user?.id ?? ''));
      return;
    } catch (err: any) {
      logger.warn('[AUTH_CB] exchangeCodeForSession threw=' + (err?.message ?? ''));
      return;
    }
  }

  const tokens = await parseTokensFromUrl(url);
  if (tokens) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (error) {
        logger.warn('[AUTH_CB] setSession error=' + (error.message ?? ''));
        return;
      }
      logger.debug('[AUTH_CB] setSession success userId=' + (data?.session?.user?.id ?? ''));
      return;
    } catch (err: any) {
      logger.warn('[AUTH_CB] setSession threw=' + (err?.message ?? ''));
      return;
    }
  }

  const otp = await parseTokenHashFromUrl(url);
  if (otp) {
    const email = getLastEmail();
    if (!email) {
      logger.warn('[AUTH_CB] verifyOtp skipped: no cached email');
      return;
    }
    try {
      const { error } = await supabase.auth.verifyOtp({
        type: otp.type as any,
        email,
        token_hash: otp.tokenHash,
      });
      if (error) {
        logger.warn('[AUTH_CB] verifyOtp error=' + (error.message ?? ''));
        return;
      }
      logger.debug('[AUTH_CB] verifyOtp success');
      return;
    } catch (err: any) {
      logger.warn('[AUTH_CB] verifyOtp threw=' + (err?.message ?? ''));
      return;
    }
  }

  logger.debug('[AUTH_CB] no code/tokens/token_hash in URL');
}
