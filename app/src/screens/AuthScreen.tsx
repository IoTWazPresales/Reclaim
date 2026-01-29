// C:\Reclaim\app\src\screens\AuthScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Platform, Linking } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, TextInput, Button } from 'react-native-paper';
import { signInWithEmail, signUpWithEmail, resetPassword, signInWithMagicLink, signInWithGoogle } from '@/lib/auth';
import { setLastEmail } from '@/state/authCache';
import { validateEmail } from '@/lib/validation';
import { logger } from '@/lib/logger';

// Configure WebBrowser to close automatically on redirect
WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'login' | 'signup';

export default function AuthScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);

  const isValid = () => {
    if (!email.trim()) return false;
    const emailValidation = validateEmail(email.trim());
    if (!emailValidation.valid) return false;
    if (mode === 'login' || forgotPasswordMode) return true;
    if (!password || password.length < 6) return false;
    if (mode === 'signup' && password !== confirmPassword) return false;
    return true;
  };

  const handleSubmit = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    
    if (!emailTrimmed) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }

    const emailValidation = validateEmail(emailTrimmed);
    if (!emailValidation.valid) {
      Alert.alert('Invalid email', emailValidation.error || 'Please enter a valid email address.');
      return;
    }

    if (forgotPasswordMode) {
      setLoading(true);
      try {
        const { success, error } = await resetPassword(emailTrimmed);
        if (error) throw error;
        Alert.alert('Reset email sent', 'Check your email for password reset instructions.');
        setForgotPasswordMode(false);
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Failed to send reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'login') {
      if (!password) {
        Alert.alert('Password required', 'Please enter your password.');
        return;
      }

      setLoading(true);
      try {
        const { user, session, error } = await signInWithEmail(emailTrimmed, password);
        if (error) throw error;
        if (user && session) {
          logger.debug('Login successful');
          // AuthProvider will handle navigation
        } else {
          Alert.alert('Error', 'Login failed. Please check your credentials.');
        }
      } catch (e: any) {
        Alert.alert('Login error', e?.message ?? 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    } else {
      // Sign up
      if (!password || password.length < 6) {
        Alert.alert('Password required', 'Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password mismatch', 'Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const { user, session, error } = await signUpWithEmail(emailTrimmed, password);
        if (error) throw error;
        if (user && session) {
          Alert.alert('Account created', 'Welcome! You are now signed in.');
          logger.debug('Sign up successful');
          // AuthProvider will handle navigation
        } else {
          Alert.alert('Success', 'Account created! Please check your email to verify your account.');
        }
      } catch (e: any) {
        Alert.alert('Sign up error', e?.message ?? 'Failed to create account. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { url, redirectTo, error } = await signInWithGoogle();
      
      if (error) throw error;
      
      if (url && redirectTo) {
        // Use WebBrowser for better OAuth handling in React Native
        logger.debug('[AUTH] Opening OAuth URL in WebBrowser');
        const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
        
        if (result.type === 'success' && result.url) {
          logger.debug('[AUTH] returnUrl=', result.url.substring(0, 150));
          // Process the OAuth callback URL directly
          const callbackUrl = result.url;
          
          // With PKCE flow, Supabase needs the code verifier which is stored in session storage
          // We should let the deep link handler in App.tsx process this, or manually trigger
          // the Supabase session recovery. The code verifier is stored by Supabase during the
          // initial signInWithOAuth call, so we need to ensure the same client instance is used.
          
          // Parse and extract the code from the callback URL
          let code: string | null = null;
          try {
            const parsedUrl = new URL(callbackUrl);
            code = parsedUrl.searchParams.get('code');
          } catch {
            // Fallback: try to extract code manually
            const match = callbackUrl.match(/[?&]code=([^&]+)/);
            code = match ? match[1] : null;
          }

          logger.debug('[AUTH_PKCE] redirect received, code exists=', !!code);

          if (code) {
            const { supabase, hasPKCEVerifier } = await import('@/lib/supabase');
            const { present: verifierPresent, length: verifierLength } = await hasPKCEVerifier();
            if (!verifierPresent) {
              logger.warn('[AUTH_PKCE] verifier missing, skipping exchange; reset to auth screen');
              throw new Error('Authentication session expired. Please try signing in again.');
            }
            logger.debug('[AUTH_PKCE] before exchange, verifier exists, length=', verifierLength);

            try {
              const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              
              if (exchangeError) {
                logger.error('Code exchange error:', exchangeError);
                
                // If code verifier is missing, this usually means:
                // 1. The app was restarted between OAuth initiation and callback
                // 2. The code verifier wasn't stored properly
                // 3. There's a storage issue
                if (exchangeError.message?.includes('code verifier') || 
                    exchangeError.message?.includes('verifier') ||
                    exchangeError.message?.includes('non-empty') ||
                    exchangeError.message?.includes('none empty')) {
                  logger.warn('PKCE code verifier issue detected. This usually means the app was restarted during OAuth flow.');
                  logger.debug('Code verifier should be stored in SecureStore during signInWithOAuth');
                  
                  // The best solution is to retry the OAuth flow from the beginning
                  // The code verifier is generated and stored during signInWithOAuth,
                  // so if it's missing, we need to start over
                  throw new Error('Authentication session expired. Please try signing in again.');
                }
                
                throw exchangeError;
              }
              
              logger.debug('[AUTH_SESSION] after exchange, user id=', data?.session?.user?.id ?? null);
              // AuthProvider will detect the session change and navigate automatically
            } catch (exchangeErr: any) {
              // Log the error for debugging
              logger.error('OAuth code exchange failed:', exchangeErr);
              
              // If it's a verifier issue, provide a user-friendly message
              if (exchangeErr.message?.includes('verifier') || 
                  exchangeErr.message?.includes('code verifier') ||
                  exchangeErr.message?.includes('non-empty') ||
                  exchangeErr.message?.includes('none empty') ||
                  exchangeErr.message?.includes('expired')) {
                // Don't show technical error - show user-friendly message
                throw new Error('Authentication session expired. Please try signing in again.');
              }
              
              // For other errors, rethrow as-is
              throw exchangeErr;
            }
          } else {
            logger.warn('No code found in OAuth callback URL');
            // Check for tokens in hash as fallback (non-PKCE flow)
            const hash = callbackUrl.includes('#') ? callbackUrl.split('#')[1] : '';
            if (hash) {
              const hashParams = new URLSearchParams(hash);
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');
              if (accessToken && refreshToken) {
                const { supabase } = await import('@/lib/supabase');
                const { error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                if (sessionError) throw sessionError;
                logger.debug('Session set from hash tokens');
              }
            }
          }
        } else if (result.type === 'cancel') {
          logger.debug('OAuth cancelled by user');
        } else {
          logger.warn('OAuth session unexpected result:', result.type);
        }
      }
    } catch (e: any) {
      // Don't log as error if it's just the PKCE verifier expiry - this is expected behavior
      const isVerifierError = e?.message?.includes('verification expired') || 
                              e?.message?.includes('code verifier') ||
                              e?.message?.includes('verifier');
      
      if (isVerifierError) {
        logger.debug('PKCE verifier expired (expected when app restarts)');
      } else {
        logger.error('Google Sign In Error:', e);
      }

      // If Supabase already has a session, the user is effectively logged in — suppress the alert.
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          logger.debug('Google sign-in error caught but session already active; skipping alert.');
          return;
        }
      } catch (sessionCheckError) {
        logger.warn('Session check after Google sign-in error failed:', sessionCheckError);
      }
      
      Alert.alert(
        'Sign In Error', 
        e?.message?.includes('verification expired') 
          ? 'Please try signing in again. This can happen if you closed the app during sign-in.'
          : (e?.message ?? 'Failed to sign in with Google. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    
    if (!emailTrimmed) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }

    const emailValidation = validateEmail(emailTrimmed);
    if (!emailValidation.valid) {
      Alert.alert('Invalid email', emailValidation.error || 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = makeRedirectUri({ path: 'auth' });
      setLastEmail(emailTrimmed);
      
      const { success, error } = await signInWithMagicLink(emailTrimmed, redirectTo);
      if (error) throw error;
      
      Alert.alert('Magic link sent', 'Check your email and tap the link to sign in.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send magic link.');
    } finally {
      setLoading(false);
    }
  };

  if (forgotPasswordMode) {
    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
        style={{ backgroundColor: theme.colors.background }}
      >
        <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>Reset Password</Text>
        <Text style={{ opacity: 0.7, marginBottom: 20, color: theme.colors.onSurfaceVariant }}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          outlineColor={theme.colors.outlineVariant}
          activeOutlineColor={theme.colors.primary}
          textColor={theme.colors.onSurface}
          style={{ marginBottom: 16 }}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={loading || !isValid()}
          style={{ marginBottom: 12 }}
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>

        <Button onPress={() => setForgotPasswordMode(false)} mode="text">
          Back to login
        </Button>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
      style={{ backgroundColor: theme.colors.background }}
    >
      <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>Reclaim</Text>
      
      {/* Tab Selector */}
      <View style={{ flexDirection: 'row', marginBottom: 24, gap: 8 }}>
        <TouchableOpacity
          onPress={() => {
            setMode('login');
            setPassword('');
            setConfirmPassword('');
          }}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            backgroundColor: mode === 'login' ? theme.colors.primary : theme.colors.surfaceVariant,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: mode === 'login' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, fontWeight: '700' }}>
            Login
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setMode('signup');
            setPassword('');
            setConfirmPassword('');
          }}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            backgroundColor: mode === 'signup' ? theme.colors.primary : theme.colors.surfaceVariant,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: mode === 'signup' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, fontWeight: '700' }}>
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      {/* Email Input */}
      <TextInput
        mode="outlined"
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        outlineColor={theme.colors.outlineVariant}
        activeOutlineColor={theme.colors.primary}
        textColor={theme.colors.onSurface}
        style={{ marginBottom: 12 }}
      />

      {/* Password Input */}
      <TextInput
        mode="outlined"
        label={mode === 'login' ? 'Password' : 'Password (min 6 characters)'}
        value={password}
        onChangeText={setPassword}
        placeholder={mode === 'login' ? 'Password' : 'Password (min 6 characters)'}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={mode === 'login' ? 'password' : 'password-new'}
        outlineColor={theme.colors.outlineVariant}
        activeOutlineColor={theme.colors.primary}
        textColor={theme.colors.onSurface}
        style={{ marginBottom: 12 }}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />

      {/* Confirm Password (Sign Up Only) */}
      {mode === 'signup' && (
        <TextInput
          mode="outlined"
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          outlineColor={theme.colors.outlineVariant}
          activeOutlineColor={theme.colors.primary}
          textColor={theme.colors.onSurface}
          style={{ marginBottom: 12 }}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
      )}

      {/* Forgot Password (Login Only) */}
      {mode === 'login' && (
        <TouchableOpacity
          onPress={() => setForgotPasswordMode(true)}
          style={{ marginBottom: 16 }}
        >
          <Text style={{ color: theme.colors.primary, textAlign: 'right' }}>Forgot password?</Text>
        </TouchableOpacity>
      )}

      {/* Submit Button */}
      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={loading || !isValid()}
        style={{ marginBottom: 12 }}
      >
        {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Sign Up'}
      </Button>

      {/* Divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.outlineVariant }} />
        <Text style={{ marginHorizontal: 12, color: theme.colors.onSurfaceVariant }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.outlineVariant }} />
      </View>

      {/* Google Sign In Button */}
      <Button
        mode="outlined"
        onPress={handleGoogleSignIn}
        disabled={loading}
        style={{ marginBottom: 12 }}
        icon={({ size, color }: { size: number; color: string }) => (
          <Ionicons name="logo-google" size={size} color={color} />
        )}
      >
        Continue with Google
      </Button>

      {/* Magic Link Option */}
      <Button
        mode="outlined"
        onPress={handleMagicLink}
        disabled={loading}
        style={{ marginBottom: 12 }}
      >
        {loading ? 'Sending…' : 'Sign in with magic link'}
      </Button>
    </ScrollView>
  );
}
