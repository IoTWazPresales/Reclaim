import React, { useEffect, useState } from 'react';
import { Alert, View, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button, Text, TextInput } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { AppThemeProvider } from '@/theme/AppThemeProvider';
import { ReclaimFontsProvider } from '@/theme/ReclaimFontsProvider';
import WebTraining from './WebTraining';

// RN Web's Alert has no modal implementation. Small synchronous spike bridge for
// the existing setup wizard; production should use accessible in-app dialogs.
Alert.alert = (title, message, buttons) => {
  if (buttons?.length) {
    const accepted = window.confirm([title, message].filter(Boolean).join('\n\n'));
    const button = accepted
      ? buttons.find(candidate => candidate.style !== 'cancel')
      : buttons.find(candidate => candidate.style === 'cancel');
    button?.onPress?.();
  } else window.alert([title, message].filter(Boolean).join('\n\n'));
};

function Content() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setReady(true); }
    });
    async function restoreSession() {
      const params = new URLSearchParams(window.location.search || window.location.hash.slice(1));
      const tokenHash = params.get('token_hash');
      if (tokenHash && params.get('type') === 'magiclink') {
        // Remove one-time credentials from the address bar before restoring UI.
        window.history.replaceState(null, '', window.location.pathname);
        const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
        if (verified.error) throw verified.error;
      }
      return supabase.auth.getSession();
    }
    void restoreSession().then(({ data, error: authError }) => {
      if (active) { setSession(data.session); setReady(true); if (authError) setError(authError.message); }
    }).catch(reason => { if (active) { setError(String(reason)); setReady(true); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function signIn() {
    setBusy(true); setError('');
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }
  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) { setError(signOutError.message); return; }
    queryClient.clear();
  }
  if (!ready) return <Text>Loading sign-in…</Text>;
  return <View style={{ flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center', padding: 16 }}>
    <Text variant="headlineMedium" accessibilityRole="header">Reclaim Web Lite</Text>
    <Text style={{ marginVertical: 12 }}>Manual training only. Guided sessions, rest alarms, notifications, Health Connect and Wear are unavailable.</Text>
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    {session ? <>
      <Button onPress={() => void signOut()}>Sign out</Button>
      <WebTraining key={session.user.id} userId={session.user.id} />
    </> : <ScrollView contentContainerStyle={{ maxWidth: 480, gap: 16, paddingVertical: 24 }}>
      <Text variant="titleLarge">Sign in</Text>
      <TextInput label="Email" accessibilityLabel="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextInput label="Password" accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={() => void signIn()} />
      <Button mode="contained" disabled={busy || !email || !password} loading={busy} onPress={() => void signIn()}>Sign in</Button>
      <Text>Training is saved to the account you sign in with.</Text>
    </ScrollView>}
  </View>;
}

export default function WebLiteApp() {
  return <SafeAreaProvider><QueryClientProvider client={queryClient}>
    <ReclaimFontsProvider><AppThemeProvider><Content /></AppThemeProvider></ReclaimFontsProvider>
  </QueryClientProvider></SafeAreaProvider>;
}
