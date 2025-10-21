// C:\Reclaim\app\src\screens\AuthScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const onSend = async () => {
    if (!email) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    setSending(true);
    try {
      // This returns exp://.../--/auth in Expo Go, and reclaim://auth in a build
      const redirectTo = makeRedirectUri({ path: 'auth' });
      console.log('Auth redirect URI:', redirectTo);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;

      Alert.alert('Magic link sent', 'Check your email and tap the link to sign in.');
    } catch (e: any) {
      Alert.alert('Sign-in error', e?.message ?? 'Could not send magic link.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8 }}>Reclaim</Text>
      <Text style={{ opacity: 0.7, marginBottom: 20 }}>Sign in with a magic link</Text>

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
        onPress={onSend}
        disabled={sending}
        style={{
          backgroundColor: '#0ea5e9',
          opacity: sending ? 0.6 : 1,
          padding: 14,
          borderRadius: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {sending ? 'Sending…' : 'Send magic link'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
