import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import {
  isInsideHomePrivacyZone,
  type RunFix,
  type RunHome,
} from '@/lib/training/runPrivacy';

const sessionIds = new Map<string, string>();

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

export async function loadRunHome(): Promise<RunHome | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('run_homes')
    .select('latitude, longitude')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    logger.warn('[RUN_ROUTE] home read failed', error);
    return null;
  }
  if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null;
  return { latitude: data.latitude, longitude: data.longitude };
}

export async function saveRunHome(home: RunHome): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('run_homes').upsert({
    user_id: userId,
    latitude: home.latitude,
    longitude: home.longitude,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function openRunSession(trainingSessionId: string, startedAt: string): Promise<string | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('run_sessions')
    .insert({
      user_id: userId,
      training_session_id: trainingSessionId,
      started_at: startedAt,
    })
    .select('id')
    .single();
  if (error) {
    logger.warn('[RUN_ROUTE] session insert failed', error);
    return null;
  }
  const id = String(data.id);
  sessionIds.set(trainingSessionId, id);
  return id;
}

export async function appendRunFix(trainingSessionId: string, fix: RunFix): Promise<boolean> {
  const runSessionId = sessionIds.get(trainingSessionId);
  if (!runSessionId) return false;
  const home = await loadRunHome();
  if (isInsideHomePrivacyZone(fix, home)) return false;
  const userId = await requireUserId();
  const { error } = await supabase.from('run_routes').insert({
    user_id: userId,
    run_session_id: runSessionId,
    recorded_at: fix.recordedAt,
    latitude: fix.latitude,
    longitude: fix.longitude,
    accuracy_m: fix.accuracyM ?? null,
  });
  if (error) {
    logger.warn('[RUN_ROUTE] point insert failed', error);
    return false;
  }
  return true;
}

export async function finishRunSession(trainingSessionId: string, endedAt: string): Promise<RunFix[]> {
  const userId = await requireUserId();
  let runSessionId = sessionIds.get(trainingSessionId) ?? null;
  if (!runSessionId) {
    const { data, error } = await supabase
      .from('run_sessions')
      .select('id')
      .eq('training_session_id', trainingSessionId)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.id) {
      if (error) logger.warn('[RUN_ROUTE] session lookup failed', error);
      return [];
    }
    runSessionId = String(data.id);
  }
  const { error: endError } = await supabase
    .from('run_sessions')
    .update({ ended_at: endedAt })
    .eq('id', runSessionId)
    .eq('user_id', userId);
  if (endError) logger.warn('[RUN_ROUTE] session end failed', endError);
  const { data, error } = await supabase
    .from('run_routes')
    .select('recorded_at, latitude, longitude, accuracy_m')
    .eq('run_session_id', runSessionId)
    .eq('user_id', userId)
    .order('recorded_at', { ascending: true });
  sessionIds.delete(trainingSessionId);
  if (error) {
    logger.warn('[RUN_ROUTE] route read failed', error);
    return [];
  }
  return (data ?? []).map((row) => ({
    recordedAt: String(row.recorded_at),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracyM: row.accuracy_m == null ? undefined : Number(row.accuracy_m),
  }));
}

export function resetRunSessionCacheForTests(): void {
  sessionIds.clear();
}
