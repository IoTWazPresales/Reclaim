# PHASE 1 — Auth PKCE root cause + fix + verification

## Symptom
- PKCE code exchange failures: "both auth code and code verifier should be non-empty".
- Unexpected logouts when app is killed between OAuth start and redirect, or when deep link opens app without in-memory verifier.

## Root cause
- **Verifier storage:** Supabase auth-js generates the code_verifier on `signInWithOAuth` and stores it via our custom `storage` (SecureStore + AsyncStorage fallback) under key `supabase.auth.token-code-verifier`. If the app is killed or the deep link is handled by a different process, that key may be missing when `exchangeCodeForSession(code)` runs.
- **No guard before exchange:** Both `AuthScreen.tsx` (WebBrowser callback) and `App.tsx` `DeepLinkAuthBridge` (Linking URL) called `exchangeCodeForSession(code)` without checking that the verifier existed, so Supabase sent an empty verifier and the server returned the error.

## Code path
1. **Verifier generated/stored:** `lib/auth.ts` → `signInWithOAuth()` → Supabase auth-js generates verifier and calls `storage.setItem('supabase.auth.token-code-verifier', value)`.
2. **Redirect/callback:** Either (a) `AuthScreen.tsx` → WebBrowser result URL with `?code=...`, or (b) `App.tsx` → `DeepLinkAuthBridge` → `Linking` URL with `code` in query params.
3. **Exchange:** Both paths called `supabase.auth.exchangeCodeForSession(code)`; Supabase reads verifier from `storage.getItem('supabase.auth.token-code-verifier')`. If missing (e.g. app restarted), exchange fails.

## Fix (surgical)
1. **`app/src/lib/supabase.ts`**
   - Exported `PKCE_VERIFIER_STORAGE_KEY` and `hasPKCEVerifier()` that reads from the same storage (SecureStore + fallback), returns `{ present, length }` (no raw value).
   - In `storage.setItem`, when key is `PKCE_VERIFIER_STORAGE_KEY`: log `[AUTH_PKCE] verifier stored, key=...`.
2. **`app/src/lib/auth.ts`**
   - Before `signInWithOAuth`: log `[AUTH_PKCE] OAuth initiating (verifier stored on redirect via storage key)`.
3. **`app/src/screens/AuthScreen.tsx`**
   - After parsing `code` from callback URL: log `[AUTH_PKCE] redirect received, code exists=...`.
   - Before `exchangeCodeForSession`: call `hasPKCEVerifier()`; if `!present`, log and throw user-friendly "Authentication session expired. Please try signing in again." (no exchange).
   - Before exchange: log `[AUTH_PKCE] before exchange, verifier exists, length=...`.
   - After successful exchange: log `[AUTH_SESSION] after exchange, user id=...`.
4. **`app/App.tsx` (DeepLinkAuthBridge)**
   - When `code` in query params: log `[AUTH_PKCE] redirect received, code exists=true`.
   - Call `hasPKCEVerifier()`; if `!present`, log `[AUTH_PKCE] verifier missing, skipping exchange`, call `supabase.auth.signOut({ scope: 'local' })`, return (no exchange).
   - Before exchange: log `[AUTH_PKCE] before exchange, verifier exists, length=...`.
   - After successful exchange: log `[AUTH_SESSION] after exchange, user id=...`.

## Verification (runtime proof)
1. **Happy path:** Sign in with Google → complete in WebBrowser → logs show: `[AUTH_PKCE] verifier stored`, then `[AUTH_PKCE] redirect received, code exists=true`, `[AUTH_PKCE] before exchange, verifier exists, length=N`, `[AUTH_SESSION] after exchange, user id=<uuid>`.
2. **Cold deep link (verifier missing):** Open app via deep link with `?code=...` without having started OAuth in this process → logs show `[AUTH_PKCE] redirect received`, `[AUTH_PKCE] verifier missing, skipping exchange`; no exchange call; no "both auth code and code verifier" error; user stays on auth screen.
3. **No accidental exchange:** Grep for `exchangeCodeForSession` — only called after `hasPKCEVerifier().present === true`.
