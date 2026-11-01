import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TrainingSetupScreen from '@/screens/training/TrainingSetupScreen';
import SessionPreviewModal from '@/components/training/SessionPreviewModal';
import {
  getActiveProgramInstance, getProgramDays, getTrainingSession, listTrainingSessions,
  createTrainingSession, createTrainingSessionItems, updateTrainingSession,
  deleteTrainingSession, type ProgramDayRow, type TrainingSessionItemRow,
} from '@/lib/api';
import { assertStartableProgramme, materializePlannedSessionItems } from '@/lib/training/buildProgramDaySession';
import { programmeWeekProposal } from '@/lib/training/programmeWeekProposal';
import { loadTrainingPerformanceSeed, withTrainingPerformanceSeed } from '@/lib/training/trainingProgramPerformanceSeed';
import type { SessionPlan } from '@/lib/training/types';
import { applySetCompletion } from '@/lib/training/applySetCompletion';
import { isSetPerformedOnItem, getPerformedSetsFromItem } from '@/lib/training/sessionWorkAuthority';
import { getExerciseById } from '@/lib/training/engine';
import { formatLocalDateYYYYMMDD } from '@/lib/training/dateUtils';

function SetRow({ item, set, sessionId, refresh }: {
  item: TrainingSessionItemRow; set: TrainingSessionItemRow['planned']['sets'][number];
  sessionId: string; refresh: () => Promise<unknown>;
}) {
  const [weight, setWeight] = useState(set.loadRequiresConfirmation ? '' : String(set.suggestedWeight));
  const [reps, setReps] = useState(String(set.targetReps));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const done = isSetPerformedOnItem(item, set.setIndex);
  const saved = getPerformedSetsFromItem(item).find(value => value.setIndex === set.setIndex);
  async function log() {
    setBusy(true); setMessage('');
    try {
      const kg = Number(weight), count = Number(reps);
      if (!weight.trim() || !Number.isFinite(kg) || kg < 0 || !Number.isInteger(count) || count < 1) {
        throw new Error('Enter a weight of zero or more and a positive whole number of reps.');
      }
      const result = await applySetCompletion({ sessionId, sessionItemId: item.id,
        exerciseId: item.exercise_id, setIndex: set.setIndex, weight: kg, reps: count });
      await refresh();
      setMessage(result.wroteOnline ? 'Saved to Supabase.' : 'Not saved. Reconnect and retry.');
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 8, marginVertical: 12 }}>
    <Text>Set {set.setIndex}{done ? ` · Saved: ${saved?.weight} kg × ${saved?.reps}` : ''}</Text>
    {!done ? <>
      <TextInput label="Weight kg" accessibilityLabel={`Weight kg set ${set.setIndex}`} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" disabled={busy} />
      <TextInput label="Reps" accessibilityLabel={`Reps set ${set.setIndex}`} value={reps} onChangeText={setReps} keyboardType="number-pad" disabled={busy} />
      <Button mode="contained" disabled={busy} loading={busy} onPress={() => void log()}>Log set {set.setIndex}</Button>
    </> : null}
    {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
  </View>;
}

export default function WebTraining({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [setup, setSetup] = useState(false);
  const [week, setWeek] = useState(1);
  const [preview, setPreview] = useState<{ day: ProgramDayRow; plan: SessionPlan } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const programme = useQuery({ queryKey: ['web-lite', userId, 'programme'], queryFn: async () => {
    const program = await getActiveProgramInstance();
    if (!program) return null;
    const [days, seed] = await Promise.all([getProgramDays(program.id), loadTrainingPerformanceSeed()]);
    return { program, days, profile: withTrainingPerformanceSeed(program.profile_snapshot, seed) };
  }});
  const programId = programme.data?.program.id;
  useEffect(() => {
    if (!programme.data) return;
    const today = formatLocalDateYYYYMMDD(new Date());
    const next = programme.data.days.find(day => day.date >= today);
    setWeek(next?.week_index ?? 1);
    // Only select the current week on programme changes, not after set logging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);
  // Server truth also recovers an unfinished manual session after refresh/storage loss.
  const active = useQuery({ queryKey: ['web-lite', userId, 'active'], queryFn: async () => {
    const sessions = await listTrainingSessions(50);
    const open = sessions.find(value => !value.ended_at);
    if (open && open.mode !== 'manual') throw new Error('A mobile session is open. Finish it on your phone before starting a web session.');
    return open?.id ?? null;
  }});
  useEffect(() => { if (active.data) setSessionId(active.data); }, [active.data]);
  const session = useQuery({ queryKey: ['web-lite', userId, 'session', sessionId],
    queryFn: () => getTrainingSession(sessionId!), enabled: !!sessionId });
  const plans = useMemo(() => programme.data
    ? programmeWeekProposal(programme.data.program.plan, week, programme.data.profile)
    : new Map<number, SessionPlan>(), [programme.data, week]);
  async function start() {
    if (!preview || !programme.data || busy) return;
    setBusy(true); setError('');
    let createdId: string | null = null;
    try {
      if (!active.isSuccess) throw new Error('Wait for the active session check before starting.');
      if (active.data) { setSessionId(active.data); setPreview(null); return; }
      assertStartableProgramme(preview.plan);
      const id = `web_lite_${crypto.randomUUID()}`;
      const items = materializePlannedSessionItems(id, preview.plan);
      await createTrainingSession({ id, mode: 'manual', goals: { ...preview.plan.goals },
        startedAt: new Date().toISOString(), programId: programme.data.program.id,
        programDayId: preview.day.id, weekIndex: preview.day.week_index,
        dayIndex: preview.day.day_index, sessionTypeLabel: preview.day.label });
      createdId = id;
      await createTrainingSessionItems(id, items);
      await updateTrainingSession(id, { decisionTrace: { notificationMode: 'normal', webLite: true } });
      setSessionId(id); setPreview(null);
      qc.setQueryData(['web-lite', userId, 'active'], id);
    } catch (reason) {
      if (createdId) {
        try { await deleteTrainingSession(createdId); }
        catch (cleanupError) { console.warn('[Web Lite] incomplete-session cleanup failed', cleanupError); }
      }
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally { setBusy(false); }
  }
  async function finish() {
    if (!sessionId) return;
    setBusy(true); setError('');
    try {
      await updateTrainingSession(sessionId, { endedAt: new Date().toISOString() });
      setSessionId(null);
      qc.setQueryData(['web-lite', userId, 'active'], null);
      await qc.invalidateQueries({ queryKey: ['web-lite', userId, 'programme'] });
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }
  if (setup) return <TrainingSetupScreen onComplete={() => {
    setSetup(false);
    void qc.invalidateQueries({ queryKey: ['web-lite', userId, 'programme'] });
  }} />;
  const queryError = programme.error || session.error || active.error;
  return <>
    <Text accessibilityRole="alert">{error || (queryError instanceof Error ? queryError.message : '')}</Text>
    {sessionId ? <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Text variant="headlineSmall" accessibilityRole="header">Manual session</Text>
      <Text>Log the work you performed. No rest timers or background guidance.</Text>
      {session.isPending ? <Text>Loading frozen session…</Text> : null}
      {session.data?.items.map(item => <View key={item.id} style={{ marginVertical: 16 }}>
        <Text variant="titleLarge">{getExerciseById(item.exercise_id)?.name ?? item.exercise_id}</Text>
        {item.planned.sets.map(set => <SetRow key={set.setIndex} item={item} set={set} sessionId={sessionId} refresh={session.refetch} />)}
      </View>)}
      <Button disabled={busy || !session.isSuccess} onPress={() => void finish()}>Finish manual session</Button>
    </ScrollView> : <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <Text variant="headlineSmall" accessibilityRole="header">Weekly plan</Text>
      <Button mode="outlined" disabled={programme.isPending || active.isPending} onPress={() => setSetup(true)}>Training setup</Button>
      {programme.isPending ? <Text>Loading programme…</Text> : null}
      {programme.isSuccess && !programme.data ? <Text>No programme yet. Open Training setup to build one.</Text> : null}
      {programme.data ? <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 2, 3, 4].map(value => <Button key={value} mode={week === value ? 'contained' : 'outlined'} onPress={() => setWeek(value)}>Week {value}</Button>)}
        </View>
        {programme.data.days.filter(day => day.week_index === week).map(day => {
          const plan = plans.get(day.day_index);
          const unavailable = !plan || plan.template === 'run';
          return <View key={day.id} style={{ paddingVertical: 12, gap: 8 }}>
            <Text variant="titleMedium">{day.date} · {day.label}</Text>
            <Text>{unavailable ? 'Run tracking is unavailable on web.' : `${plan.exercises.length} exercises`}</Text>
            <Button mode="outlined" disabled={unavailable || busy || !active.isSuccess} onPress={() => plan && setPreview({ day, plan })}>Preview {day.label}</Button>
          </View>;
        })}
      </> : null}
    </ScrollView>}
    <SessionPreviewModal visible={!!preview} plan={preview?.plan ?? null} sessionMode="normal"
      onSessionModeChange={() => { /* Manual-only web capability. */ }} onCancel={() => setPreview(null)} onConfirm={() => void start()} />
    {busy ? <Text accessibilityLiveRegion="polite">Saving…</Text> : null}
  </>;
}
