// Supabase Edge Function: delete-account
// Service-role wipe of every user-keyed table, including RLS-blocked append-only
// rows (training_events) and optional run tables. Then deletes the auth user.

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Keep in lockstep with PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES (N-0037). */
const USER_ID_TABLES = [
  'routine_suggestions',
  'routine_templates',
  'insight_feedback',
  'medication_logs',
  'medication_schedules',
  'training_post_session_checkins',
  'mood_checkins',
  'mood_entries',
  'meds_log',
  'meds',
  'sleep_sessions',
  'sleep_candidates',
  'sleep_prefs',
  'mindfulness_events',
  'meditation_sessions',
  'entries',
  'activity_daily',
  'logs',
  'app_logs',
  'training_sessions',
  'training_program_days',
  'training_program_instances',
  'training_profiles',
  'training_events',
  'vitals_daily',
  'run_sessions',
  'run_routes',
] as const;

const ID_KEYED_TABLES = ['profiles'] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isMissingRelation(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('does not exist') || lower.includes('42p01') || lower.includes('could not find the table');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceKey || !authHeader) {
    return json({ error: 'missing_server_config' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) {
    return json({ error: 'unauthorized' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const deleted: string[] = [];
  const skipped: string[] = [];

  for (const table of USER_ID_TABLES) {
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (!error) {
      deleted.push(table);
      continue;
    }
    if (isMissingRelation(error.message ?? '')) {
      skipped.push(table);
      continue;
    }
    return json({ error: 'delete_failed', table, message: error.message }, 500);
  }

  for (const table of ID_KEYED_TABLES) {
    const { error } = await admin.from(table).delete().eq('id', userId);
    if (!error) {
      deleted.push(table);
      continue;
    }
    if (isMissingRelation(error.message ?? '')) {
      skipped.push(table);
      continue;
    }
    return json({ error: 'delete_failed', table, message: error.message }, 500);
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    return json({ error: 'auth_delete_failed', message: authDeleteError.message, deleted, skipped }, 500);
  }

  return json({ ok: true, userId, deleted, skipped });
});
