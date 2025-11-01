// C:\Reclaim\app\src\screens\AuthScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Platform, Linking } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmail, signUpWithEmail, resetPassword, signInWithMagicLink, signInWithGoogle } from '@/lib/auth';
import { setLastEmail } from '@/state/authCache';
import { validateEmail } from '@/lib/validation';
import { logger } from '@/lib/logger';

type AuthMode = 'login' | 'signup';

export default function AuthScreen() {
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
      const { url, error } = await signInWithGoogle();
      
      if (error) throw error;
      
      if (url) {
        // Open OAuth URL in browser - Supabase will handle redirect back to app
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          // The deep link handler in App.tsx will catch the redirect
        } else {
          Alert.alert('Error', 'Could not open authentication page.');
        }
      }
    } catch (e: any) {
      Alert.alert('Google Sign In Error', e?.message ?? 'Failed to sign in with Google. Please try again.');
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8 }}>Reset Password</Text>
        <Text style={{ opacity: 0.7, marginBottom: 20 }}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !isValid()}
          style={{
            backgroundColor: '#0ea5e9',
            opacity: loading || !isValid() ? 0.6 : 1,
            padding: 14,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setForgotPasswordMode(false)}>
          <Text style={{ color: '#0ea5e9', textAlign: 'center' }}>Back to login</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8 }}>Reclaim</Text>
      
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
            backgroundColor: mode === 'login' ? '#0ea5e9' : '#f3f4f6',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: mode === 'login' ? '#fff' : '#111', fontWeight: '700' }}>
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
            backgroundColor: mode === 'signup' ? '#0ea5e9' : '#f3f4f6',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: mode === 'signup' ? '#fff' : '#111', fontWeight: '700' }}>
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      {/* Email Input */}
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      />

      {/* Password Input */}
      <View style={{ position: 'relative', marginBottom: 12 }}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'login' ? 'Password' : 'Password (min 6 characters)'}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={mode === 'login' ? 'password' : 'password-new'}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 12,
            padding: 12,
            paddingRight: 50,
          }}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            padding: 4,
          }}
        >
          <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirm Password (Sign Up Only) */}
      {mode === 'signup' && (
        <View style={{ position: 'relative', marginBottom: 12 }}>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 12,
              padding: 12,
            }}
          />
        </View>
      )}

      {/* Forgot Password (Login Only) */}
      {mode === 'login' && (
        <TouchableOpacity
          onPress={() => setForgotPasswordMode(true)}
          style={{ marginBottom: 16 }}
        >
          <Text style={{ color: '#0ea5e9', textAlign: 'right' }}>Forgot password?</Text>
        </TouchableOpacity>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading || !isValid()}
        style={{
          backgroundColor: '#0ea5e9',
          opacity: loading || !isValid() ? 0.6 : 1,
          padding: 14,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
        <Text style={{ marginHorizontal: 12, color: '#6b7280' }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
      </View>

      {/* Google Sign In Button */}
      <TouchableOpacity
        onPress={handleGoogleSignIn}
        disabled={loading}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          backgroundColor: '#fff',
          marginBottom: 12,
        }}
      >
        <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginRight: 8 }} />
        <Text style={{ color: '#111', fontWeight: '600' }}>
          Continue with Google
        </Text>
      </TouchableOpacity>

      {/* Magic Link Option */}
      <TouchableOpacity
        onPress={handleMagicLink}
        disabled={loading}
        style={{
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text style={{ color: '#111', fontWeight: '600' }}>
          {loading ? 'Sending…' : 'Sign in with magic link'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
