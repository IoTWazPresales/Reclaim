// C:\Reclaim\app\src\screens\AuthScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, TextInput, Button } from 'react-native-paper';
import { signInWithEmail, signUpWithEmail, resetPassword, signInWithMagicLink, signInWithGoogle } from '@/lib/auth';
import { setLastEmail } from '@/state/authCache';
import { validateEmail } from '@/lib/validation';
import { logger } from '@/lib/logger';

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
        logger.debug('[AUTH_SUPABASE_URL] ' + url.substring(0, 300));
        logger.debug('[AUTH] Opening OAuth in browser - callback will arrive via deep link');
        
        // Open OAuth URL in default browser (not Chrome Custom Tabs)
        // This allows the reclaim:// callback to properly trigger our deep link handler
        await Linking.openURL(url);
        
        logger.debug('[AUTH] Browser opened - waiting for OAuth callback via deep link');
        // Don't wait for WebBrowser result - the deep link handler will process the callback
        // Wait up to 60 seconds for the session to be created via deep link
        const startTime = Date.now();
        const maxWait = 60000; // 60 seconds
        
        while (Date.now() - startTime < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            logger.debug('[AUTH] OAuth success - session created via deep link');
            return;
          }
        }
        
        logger.debug('[AUTH] OAuth timeout - session not created. User may have cancelled or not completed sign-in.');
        return; // Don't throw error, just return
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
      
      // Don't show alert if user cancelled
      if (e?.message?.includes('cancelled')) {
        return;
      }
      
      Alert.alert(
        'Sign In Error', 
        e?.message?.includes('verification expired') 
          ? 'Please try signing in again. This can happen if you closed the app during sign-in.'
          : (e?.message ?? 'Failed to sign in with Google. Please try again.')
      );
    } finally {
      // Check if session was created via deep link while we were waiting
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          logger.debug('[AUTH] Sign-in complete via deep link callback');
        }
      } catch {
        // Ignore
      }
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
