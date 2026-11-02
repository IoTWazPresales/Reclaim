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
  const [notice, setNotice] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setReady(true); }
    });
    async function restoreSession() {
      return supabase.auth.getSession();
    }
    void restoreSession().then(({ data, error: authError }) => {
      if (active) { setSession(data.session); setReady(true); if (authError) setError(authError.message); }
    }).catch(reason => { if (active) { setError(String(reason)); setReady(true); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function authenticate() {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const credentials = { email: email.trim(), password };
      const result = creatingAccount
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);
      if (creatingAccount && !result.error && !result.data.session) {
        setNotice('Check your email to confirm your account. After clicking the confirmation email you may land on an unrelated page; ignore it, open the beta URL and sign in.');
        setCreatingAccount(false);
      }
      if (result.error) throw result.error;
      setPassword('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }
  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) { setError(signOutError.message); return; }
    queryClient.clear();
    setNotice('');
  }
  if (!ready) return <Text>Loading sign-in…</Text>;
  return <View style={{ flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center', padding: 16, paddingLeft: 'max(16px, env(safe-area-inset-left))' as unknown as number, paddingRight: 'max(16px, env(safe-area-inset-right))' as unknown as number, paddingTop: 'max(16px, env(safe-area-inset-top))' as unknown as number, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' as unknown as number }}>
    <Text variant="headlineMedium" accessibilityRole="header">Reclaim Web Lite</Text>
    <Text style={{ marginVertical: 12 }}>Not available on web: guided timers, notifications, rest alarms, Health Connect, Wear and offline logging.</Text>
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite">{notice}</Text> : null}
    {session ? <>
      <Button onPress={() => void signOut()}>Sign out</Button>
      <WebTraining key={session.user.id} userId={session.user.id} />
    </> : <ScrollView contentContainerStyle={{ maxWidth: 480, gap: 16, paddingVertical: 24 }}>
      <Text variant="titleLarge">{creatingAccount ? 'Create account' : 'Sign in'}</Text>
      <TextInput label="Email" accessibilityLabel="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextInput label="Password" accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={creatingAccount ? "new-password" : "current-password"} onSubmitEditing={() => void authenticate()} />
      <Button mode="contained" disabled={busy || !email || !password} loading={busy} onPress={() => void authenticate()}>{creatingAccount ? 'Create account' : 'Sign in'}</Button>
      <Button disabled={busy} onPress={() => { setCreatingAccount(!creatingAccount); setError(''); }}>{creatingAccount ? 'Already have an account? Sign in' : 'New here? Create account'}</Button>
      <Text>Training is saved to the account you sign in with. Password reset is not supported in the beta.</Text>
    </ScrollView>}
  </View>;
}

export default function WebLiteApp() {
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    const previous = viewport?.getAttribute('content');
    viewport?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    const root = document.getElementById('root');
    const resize = () => { if (root) root.style.height = `${window.visualViewport?.height ?? window.innerHeight}px`; };
    resize();
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      if (root) root.style.height = '';
      if (previous) viewport?.setAttribute('content', previous);
    };
  }, []);
  return <SafeAreaProvider><QueryClientProvider client={queryClient}>
    <ReclaimFontsProvider><AppThemeProvider><Content /></AppThemeProvider></ReclaimFontsProvider>
  </QueryClientProvider></SafeAreaProvider>;
}
