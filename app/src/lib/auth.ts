/**
 * Authentication service for multiple auth methods
 * Supports: Email/Password, Google OAuth, Apple Sign In, Magic Link
 */

import { supabase } from './supabase';
import { logger } from './logger';

// ==================== Email/Password Authentication ====================

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw error;

    logger.debug('Sign up successful:', data.user?.email);
    return { user: data.user, session: data.session, error: null };
  } catch (error: any) {
    logger.error('Sign up error:', error);
    return { user: null, session: null, error };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw error;

    logger.debug('Sign in successful:', data.user?.email);
    return { user: data.user, session: data.session, error: null };
  } catch (error: any) {
    logger.error('Sign in error:', error);
    return { user: null, session: null, error };
  }
}

/**
 * Reset password (send password reset email)
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'reclaim://auth',
    });

    if (error) throw error;

    logger.debug('Password reset email sent');
    return { success: true, error: null };
  } catch (error: any) {
    logger.error('Password reset error:', error);
    return { success: false, error };
  }
}

// ==================== Session Management ====================

/**
 * Refresh current session
 */
export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) throw error;

    logger.debug('Session refreshed');
    return { session: data.session, error: null };
  } catch (error: any) {
    logger.error('Session refresh error:', error);
    return { session: null, error };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    return { session: data.session, error: null };
  } catch (error: any) {
    logger.error('Get session error:', error);
    return { session: null, error };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    logger.debug('Sign out successful');
    return { success: true, error: null };
  } catch (error: any) {
    logger.error('Sign out error:', error);
    return { success: false, error };
  }
}

/**
 * Check if session needs refresh (refresh if expires in < 5 minutes)
 */
export async function refreshSessionIfNeeded() {
  try {
    const { session } = await getCurrentSession();
    
    if (!session) return { refreshed: false, error: null };

    // Check if token expires soon
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const timeUntilExpiry = expiresAt - Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (timeUntilExpiry < fiveMinutes) {
      logger.debug('Refreshing session (expires soon)');
      return await refreshSession();
    }

    return { refreshed: false, error: null };
  } catch (error: any) {
    logger.error('Refresh session check error:', error);
    return { refreshed: false, error };
  }
}

// ==================== OAuth Authentication ====================

/**
 * Sign in with Google OAuth
 * Uses Supabase OAuth which handles the full flow
 */
export async function signInWithGoogle() {
  try {
    // Use makeRedirectUri for proper redirect handling in Expo
    const { makeRedirectUri } = await import('expo-auth-session');
    const redirectTo = makeRedirectUri({
      path: 'auth',
      preferLocalhost: true,
      native: 'reclaim://auth',
    });
    
    logger.debug('Initiating Google OAuth with redirect:', redirectTo);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: false, // We use WebBrowser.openAuthSessionAsync instead
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      logger.error('Google OAuth initiation error:', error);
      throw error;
    }

    if (!data.url) {
      throw new Error('No OAuth URL returned');
    }

    logger.debug('Google OAuth URL generated');
    return { url: data.url, redirectTo, error: null };
  } catch (error: any) {
    logger.error('Google OAuth error:', error);
    return { url: null, redirectTo: null, error };
  }
}

// ==================== Magic Link (Backward Compatibility) ====================

/**
 * Sign in with magic link (OTP) - backward compatibility
 */
export async function signInWithMagicLink(email: string, redirectTo?: string) {
  try {
    const { makeRedirectUri } = await import('expo-auth-session');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo:
          redirectTo ||
          makeRedirectUri({
            path: 'auth',
            preferLocalhost: true,
            native: 'reclaim://auth',
          }),
      },
    });

    if (error) throw error;

    logger.debug('Magic link sent');
    return { success: true, error: null };
  } catch (error: any) {
    logger.error('Magic link error:', error);
    return { success: false, error };
  }
}

