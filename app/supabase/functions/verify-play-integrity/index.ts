// Supabase Edge Function: verify-play-integrity
// Monitor-only verifier for Google Play Integrity tokens.

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6';

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const alg = 'RS256';
  const audience = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
  const key = await importPKCS8(sa.private_key, alg);
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/playintegrity' })
    .setProtectedHeader({ alg, typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const tokenRes = await fetch(audience, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`token_exchange_failed:${tokenRes.status}`);
  }
  const tokenJson = await tokenRes.json();
  return String(tokenJson.access_token ?? '');
}

function summarizeVerdict(payload: any) {
  const requestDetails = payload?.requestDetails ?? {};
  const appIntegrity = payload?.appIntegrity ?? {};
  const deviceIntegrity = payload?.deviceIntegrity ?? {};
  const accountDetails = payload?.accountDetails ?? {};

  return {
    requestPackageName: requestDetails?.requestPackageName ?? null,
    appRecognitionVerdict: appIntegrity?.appRecognitionVerdict ?? null,
    certificateSha256Digest: appIntegrity?.certificateSha256Digest ?? null,
    packageName: appIntegrity?.packageName ?? null,
    deviceRecognitionVerdict: deviceIntegrity?.deviceRecognitionVerdict ?? [],
    licensingVerdict: accountDetails?.appLicensingVerdict ?? null,
    requestHash: requestDetails?.requestHash ?? null,
    timestampMillis: requestDetails?.timestampMillis ?? null,
  };
}

async function resolveUserId(authHeader: string | null): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !anonKey || !authHeader) return null;

  const sb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  try {
    const serviceAccountRaw = Deno.env.get('PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON');
    const packageName = Deno.env.get('PLAY_INTEGRITY_PACKAGE_NAME');
    if (!serviceAccountRaw || !packageName) {
      return json({ error: 'missing_server_config' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const integrityToken = String(body?.integrityToken ?? '');
    const nonce = String(body?.nonce ?? '');
    if (!integrityToken || !nonce) {
      return json({ error: 'integrityToken_and_nonce_required' }, 400);
    }

    const userId = await resolveUserId(req.headers.get('Authorization'));
    const serviceAccount = JSON.parse(serviceAccountRaw) as ServiceAccount;
    const accessToken = await getAccessToken(serviceAccount);

    const decodeUrl = `https://playintegrity.googleapis.com/v1/${encodeURIComponent(packageName)}:decodeIntegrityToken`;
    const decodeRes = await fetch(decodeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ integrityToken }),
    });
    const decodeJson = await decodeRes.json().catch(() => ({}));
    if (!decodeRes.ok) {
      return json(
        {
          ok: false,
          monitorOnly: true,
          error: 'decode_failed',
          status: decodeRes.status,
          details: decodeJson,
        },
        502,
      );
    }

    const tokenPayloadExternal = decodeJson?.tokenPayloadExternal ?? {};
    const summary = summarizeVerdict(tokenPayloadExternal);

    return json({
      ok: true,
      monitorOnly: true,
      userId,
      summary,
      // Raw payload included for monitor-only analysis. Keep this server-side only.
      payload: tokenPayloadExternal,
    });
  } catch (error: any) {
    return json(
      {
        ok: false,
        monitorOnly: true,
        error: 'unexpected_error',
        message: error?.message ?? String(error),
      },
      500,
    );
  }
});

