import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Chip, Divider, HelperText, IconButton, List, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { Med, MedLog } from '@/lib/api';
import {
  deleteMed,
  listMeds,
  parseSchedule,
  upsertMed,
  logMedDose,
  listMedLogsLastNDays,
} from '@/lib/api';
import {
  useNotifications,
  cancelAllReminders,
  scheduleMedReminderActionable,
  cancelRemindersForMed,
} from '@/hooks/useNotifications';
import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { rescheduleRefillRemindersIfEnabled } from '@/lib/refillReminders';

/* ---------- Small date helpers ---------- */
const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const endOfToday = () => { const d = new Date(); d.setHours(23,59,59,999); return d; };
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

/* ---------- Local helpers for “Due Today” generation ---------- */
function hhmmToDate(base: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  const d = new Date(base);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
function getTodaysDoses(schedule: { times: string[]; days: number[] } | undefined, ref = new Date()) {
  if (!schedule?.times?.length || !schedule?.days?.length) return [];
  // Your days are 1..7 (Mon..Sun). JS getDay(): Sun=0..Sat=6.
  const jsDay = ref.getDay(); // 0..6
  const appDay = jsDay === 0 ? 7 : jsDay; // 1..7
  if (!schedule.days.includes(appDay)) return [];
  return schedule.times.map((t) => hhmmToDate(ref, t));
}

/* ---------- COMPAT: some logs may have scheduled_for/created_at ---------- */
type MedLogCompat = MedLog & { scheduled_for?: string | null; created_at?: string | null };
function logWhenISO(l: MedLogCompat): string {
  return l.scheduled_for ?? l.taken_at ?? l.created_at ?? new Date().toISOString();
}
function looseDate(l: MedLogCompat): Date { return new Date(logWhenISO(l)); }

/* ---------- Basic validators for form UX ---------- */
function valTimesCSV(s: string) {
  // loose validator: HH:MM[,HH:MM]...
  return s.split(',').every((p) => /^\d{1,2}:\d{2}$/.test(p.trim()));
}
function valDaysCSVorRanges(s: string) {
  // Accepted: "1-5,7" or "1,2,6,7"
  return s.split(',').every((p) => /^(\d|[1-7])(-(\d|[1-7]))?$/.test(p.trim()));
}

export default function MedsScreen() {
  // Keep notif categories/listener alive
  useNotifications();

  const navigation = useNavigation<any>(); // MedsStack: navigate('MedDetails', { id })
  const qc = useQueryClient();
  const medsQ = useQuery({ queryKey: ['meds'], queryFn: () => listMeds() });
  const logsQ = useQuery({ queryKey: ['meds_log:last7'], queryFn: () => listMedLogsLastNDays(7) });

  const { scheduleForMed } = useMedReminderScheduler();

  const logMut = useMutation({
    mutationFn: (args: { med_id: string; status: 'taken' | 'skipped' | 'missed'; scheduled_for?: string }) =>
      logMedDose(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meds_log:last7'] }),
    onError: (e: any) => Alert.alert('Log error', e?.message ?? 'Failed to log dose'),
  });

  // editing + form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState('08:00,21:00'); // CSV
  const [days, setDays] = useState('1-7'); // CSV or ranges

  const [showHistory, setShowHistory] = useState(false);
  const [filterMedId, setFilterMedId] = useState<string | null>(null);

  const addMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name required');
      if (!valTimesCSV(times)) throw new Error('Times must be CSV of HH:MM (e.g., 08:00,21:00)');
      if (!valDaysCSVorRanges(days)) throw new Error('Days must be CSV of 1..7 or ranges like 1-5');
      const schedule = parseSchedule(times, days);
      return upsertMed({
        id: editingId ?? undefined,
        name: name.trim(),
        dose: dose.trim() || undefined,
        schedule,
      });
    },
    onSuccess: async (savedMed: Med) => {
      setEditingId(null);
      setName('');
      setDose('');
      setTimes('08:00,21:00');
      setDays('1-7');

      await qc.invalidateQueries({ queryKey: ['meds'] });

      try {
        // cancel old, then schedule the next 24h for this med (uses your hook)
        await cancelRemindersForMed(savedMed.id!);
        await scheduleForMed(savedMed);
        await rescheduleRefillRemindersIfEnabled();
      } catch (e: any) {
        // Silently fail - notifications are not critical for saving med
      }

      Alert.alert('Saved', 'Medication saved and reminders scheduled for the next 24h.');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save med'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteMed(id),
    onSuccess: async (_data, id) => {
      await cancelRemindersForMed(id);
      await qc.invalidateQueries({ queryKey: ['meds'] });
      await rescheduleRefillRemindersIfEnabled();
    },
  });

  const scheduleAll = async () => {
    try {
      const meds = medsQ.data as Med[] | undefined;
      if (!meds?.length) {
        Alert.alert('Nothing to schedule', 'Add a medication first.');
        return;
      }
      await cancelAllReminders();
      let count = 0;
      for (const m of meds) {
        await scheduleForMed(m);
        count++;
      }
      await rescheduleRefillRemindersIfEnabled();
      Alert.alert('Reminders set', `Scheduled reminders for ${count} medication${count === 1 ? '' : 's'} (next 24h each).`);
    } catch (e: any) {
      Alert.alert('Scheduling error', e?.message ?? 'Failed to schedule');
    }
  };

  const theme = useTheme();

  const renderCard = (item: Med) => {
    const s = item.schedule;
    const timesPreview = s?.times?.join(', ') ?? '';
    const daysPreview = s?.days?.join(',') ?? '';
    const preview = s ? `Times: ${timesPreview} • Days: ${daysPreview}` : 'No schedule';

    return (
      <Card
        key={item.id ?? item.name}
        mode="elevated"
        style={{
          borderRadius: 18,
          marginBottom: 12,
        }}
      >
        <Card.Title
          title={item.name}
          titleStyle={{ textDecorationLine: 'underline' }}
          subtitle={item.dose}
          subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          onPress={() => navigation.navigate('MedDetails', { id: item.id! })}
          left={(props: any) => <List.Icon {...props} icon="pill" />}
        />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {preview}
          </Text>
          <Divider style={{ marginVertical: 12 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8 }}>
            <Button
              mode="text"
              onPress={() => {
                setEditingId(item.id!);
                setName(item.name);
                setDose(item.dose ?? '');
                setTimes(item.schedule?.times?.join(',') ?? '08:00,21:00');
                setDays(item.schedule?.days?.join(',') ?? '1-7');
              }}
              accessibilityLabel={`Edit ${item.name}`}
            >
              Edit
            </Button>
            <Button
              mode="text"
              onPress={() => delMut.mutate(item.id!)}
              textColor={theme.colors.error}
              accessibilityLabel={`Delete ${item.name}`}
            >
              Delete
            </Button>
            <Button
              mode="contained-tonal"
              onPress={() => logMut.mutate({ med_id: item.id!, status: 'taken' })}
              accessibilityLabel={`Log ${item.name} as taken`}
            >
              Taken
            </Button>
            <Button
              mode="outlined"
              onPress={() => logMut.mutate({ med_id: item.id!, status: 'skipped' })}
              accessibilityLabel={`Log ${item.name} as skipped`}
            >
              Skipped
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Adherence summary (last 7 days)
  const AdherenceBlock = () => {
    if (!logsQ.data) return null;
    const logs = (logsQ.data as MedLog[]) || [];
    const taken = logs.filter((l) => l.status === 'taken').length;
    const total = logs.length || 1;
    const pct = Math.round((taken / total) * 100);

    // simple day streak (any taken on a day counts)
    const map = new Map<string, boolean>();
    for (const l of logs) {
      const d = new Date((l as MedLogCompat).taken_at ?? (l as MedLogCompat).created_at ?? Date.now());
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      map.set(day, (map.get(day) ?? false) || l.status === 'taken');
    }
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = d.toISOString();
      if (map.get(key)) streak++;
      else break;
    }

    return (
      <Card mode="elevated" style={{ borderRadius: 18, marginBottom: 16 }}>
        <Card.Title title="Adherence (last 7 days)" />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            Taken: {taken}/{total} ({pct}%)
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
            Current streak: {streak} day{streak === 1 ? '' : 's'}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  // Due Today inline actions — now using schedule->today's times (all occurrences)
  const DueTodayBlock: React.FC<{
    meds: Med[];
    logNow: (payload: { med_id: string; status: 'taken'|'skipped'|'missed'; scheduled_for?: string }) => void;
  }> = ({ meds, logNow }) => {
    const today = startOfToday();
    const end = endOfToday();

    const items = useMemo(() => {
      const logs = (logsQ.data ?? []) as MedLog[];
      const rows: Array<{ key: string; med: Med; dueISO: string; past: boolean; logged?: MedLog }> = [];
      for (const m of meds) {
        const all = getTodaysDoses(m.schedule, today);
        for (const dt of all) {
          if (dt >= today && dt <= end && isSameDay(dt, today)) {
            const isPast = dt.getTime() < Date.now();
            // Check if this dose was already logged
            const logged = logs.find(l => 
              l.med_id === m.id && 
              l.scheduled_for && 
              Math.abs(new Date(l.scheduled_for).getTime() - dt.getTime()) < 60000 // within 1 minute
            );
            rows.push({ key: `${m.id}-${dt.toISOString()}`, med: m, dueISO: dt.toISOString(), past: isPast, logged });
          }
        }
      }
      rows.sort((a,b) => a.dueISO.localeCompare(b.dueISO));
      return rows;
    }, [meds, logsQ.data]);

    if (items.length === 0) return null;

    return (
      <Card mode="elevated" style={{ borderRadius: 18, marginBottom: 16 }}>
        <Card.Title title="Due today" />
        <Card.Content>
          {items.map(({ key, med, dueISO, past, logged }, index) => (
            <View
              key={key}
              style={{
                paddingVertical: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: theme.colors.outlineVariant,
              }}
            >
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                {new Date(dueISO).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • {med.name}
                {med.dose ? ` — ${med.dose}` : ''}
                {past ? ' (past)' : ''}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 8, columnGap: 8 }}>
                {logged?.status === 'taken' ? (
                  <>
                    <Button
                      mode="contained-tonal"
                      disabled
                      style={{ flex: 1 }}
                    >
                      Taken
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        // For now, we'll need to delete the log and re-log, but that's complex
                        // For simplicity, show a message
                        Alert.alert(
                          'Already logged',
                          'This dose has already been logged as taken. To change it, please delete the log entry first.',
                          [{ text: 'OK' }]
                        );
                      }}
                      accessibilityLabel={`Reset ${med.name} log`}
                    >
                      Reset
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      mode="contained"
                      onPress={() => logNow({ med_id: med.id!, status: 'taken', scheduled_for: dueISO })}
                      accessibilityLabel={`Log ${med.name} as taken`}
                    >
                      Take
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => logNow({ med_id: med.id!, status: 'skipped', scheduled_for: dueISO })}
                      accessibilityLabel={`Log ${med.name} as skipped`}
                    >
                      Skip
                    </Button>
                    <Button
                      mode="text"
                      textColor={theme.colors.error}
                      onPress={() => logNow({ med_id: med.id!, status: 'missed', scheduled_for: dueISO })}
                      accessibilityLabel={`Log ${med.name} as missed`}
                    >
                      Missed
                    </Button>
                  </>
                )}
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const meds = (medsQ.data ?? []) as Med[];

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
      >
        <View style={{ marginBottom: 16 }}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>
            Medications
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Keep your regimen organised, stay on track with reminders, and review progress at a glance.
          </Text>
        </View>

        <AdherenceBlock />
        <DueTodayBlock meds={meds} logNow={(p) => logMut.mutate(p as any)} />

        <Card mode="elevated" style={{ borderRadius: 20, marginBottom: 16 }}>
          <Card.Title title={editingId ? 'Update medication' : 'Add medication'} />
          <Card.Content>
            <TextInput
              mode="outlined"
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sertraline"
              accessibilityLabel="Medication name"
              style={{ marginBottom: 12 }}
            />

            <TextInput
              mode="outlined"
              label="Dose (optional)"
              value={dose}
              onChangeText={setDose}
              placeholder="e.g. 50 mg"
              accessibilityLabel="Medication dose"
              style={{ marginBottom: 12 }}
            />

            <TextInput
              mode="outlined"
              label="Times (HH:MM CSV)"
              value={times}
              onChangeText={setTimes}
              placeholder="08:00,21:00"
              accessibilityLabel="Medication times"
              keyboardType="numbers-and-punctuation"
            />
            <HelperText type="error" visible={!valTimesCSV(times)} style={{ marginBottom: 12 }}>
              Use HH:MM separated by commas (e.g. 08:00,21:00)
            </HelperText>

            <TextInput
              mode="outlined"
              label="Days (1=Mon…7=Sun; CSV or ranges)"
              value={days}
              onChangeText={setDays}
              placeholder="1-7"
              accessibilityLabel="Medication schedule days"
              keyboardType="numbers-and-punctuation"
            />
            <HelperText type="error" visible={!valDaysCSVorRanges(days)} style={{ marginBottom: 12 }}>
              Use numbers 1-7 or ranges like 1-5 separated by commas.
            </HelperText>

            <Button
              mode="contained"
              onPress={() => addMut.mutate()}
              loading={addMut.isPending}
              accessibilityLabel={editingId ? 'Update medication' : 'Save medication'}
            >
              {addMut.isPending ? (editingId ? 'Updating…' : 'Saving…') : editingId ? 'Update medication' : 'Save medication'}
            </Button>

            {editingId && (
              <Button
                mode="text"
                onPress={() => {
                  setEditingId(null);
                  setName('');
                  setDose('');
                  setTimes('08:00,21:00');
                  setDays('1-7');
                }}
                style={{ marginTop: 8 }}
                accessibilityLabel="Cancel medication edit"
              >
                Cancel edit
              </Button>
            )}
          </Card.Content>
        </Card>

        {medsQ.isLoading && (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Loading medications…
          </Text>
        )}
        {medsQ.error && (
          <HelperText type="error" visible style={{ marginBottom: 12 }}>
            {(medsQ.error as any)?.message ?? 'Failed to load medications.'}
          </HelperText>
        )}

        {meds.length === 0 && !medsQ.isLoading ? (
          <Card mode="outlined" style={{ borderRadius: 20, marginBottom: 16 }}>
            <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
              <MaterialCommunityIcons
                name="pill"
                size={48}
                color={theme.colors.primary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text variant="titleMedium" style={{ marginTop: 12 }}>
                No medications yet
              </Text>
              <Text
                variant="bodyMedium"
                style={{ marginTop: 6, textAlign: 'center', color: theme.colors.onSurfaceVariant }}
              >
                Add your first medication above to start scheduling reminders and tracking adherence.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          meds.map(renderCard)
        )}

        <Card mode="contained-tonal" style={{ borderRadius: 20, marginTop: 12 }}>
          <Card.Content style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12 }}>
            <Button mode="contained" onPress={scheduleAll} accessibilityLabel="Schedule reminders for all medications">
              Schedule reminders
            </Button>
            <Button
              mode="outlined"
              onPress={async () => {
                await cancelAllReminders();
                Alert.alert('Cleared', 'All reminders canceled.');
              }}
              accessibilityLabel="Clear all medication reminders"
            >
              Clear reminders
            </Button>
            <Button mode="text" onPress={() => setShowHistory(true)} accessibilityLabel="View medication history">
              View history
            </Button>
            <Button
              mode="outlined"
              icon="bell-ring"
              onPress={async () => {
                try {
                  const med = meds[0];
                  if (!med) {
                    Alert.alert('Add a medication first');
                    return;
                  }
                  const when = new Date(Date.now() + 10_000);
                  await scheduleMedReminderActionable({
                    medId: med.id!,
                    medName: med.name,
                    doseLabel: med.dose,
                    doseTimeISO: when.toISOString(),
                  });
                  Alert.alert('Test scheduled', `Actionable reminder for "${med.name}" in ~10 seconds.`);
                } catch (e: any) {
                  Alert.alert('Notification error', e?.message ?? 'Failed to schedule test notification');
                }
              }}
              accessibilityLabel="Schedule a test actionable reminder"
            >
              Test reminder in 10s
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        {showHistory && (
          <Card
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 32,
            }}
          >
            <Card.Title
              title="History (last 7 days)"
              right={(props: any) => (
                <IconButton
                  {...props}
                  icon="close"
                  onPress={() => setShowHistory(false)}
                  accessibilityLabel="Close history"
                />
              )}
            />
            <Card.Content style={{ maxHeight: '65%' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8, marginBottom: 12 }}>
                <Chip
                  selected={!filterMedId}
                  onPress={() => setFilterMedId(null)}
                  accessibilityLabel="Filter history to all medications"
                >
                  All
                </Chip>
                {meds.map((m: Med) => (
                  <Chip
                    key={m.id}
                    selected={filterMedId === m.id}
                    onPress={() => setFilterMedId(m.id!)}
                    accessibilityLabel={`Filter history to ${m.name}`}
                  >
                    {m.name}
                  </Chip>
                ))}
              </View>

              <ScrollView>
                {(((logsQ.data as MedLog[] | undefined) ?? [])
                  .filter((log) => {
                    if (!filterMedId) return true;
                    return log.med_id === filterMedId;
                  })
                  .sort(
                    (a, b) =>
                      new Date((b as MedLogCompat).taken_at ?? (b as MedLogCompat).created_at ?? Date.now()).getTime() -
                      new Date((a as MedLogCompat).taken_at ?? (a as MedLogCompat).created_at ?? Date.now()).getTime(),
                  ))?.map((log) => (
                    <View
                      key={log.id}
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.outlineVariant,
                      }}
                    >
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                        {new Date((log as MedLogCompat).taken_at ?? (log as MedLogCompat).created_at ?? Date.now()).toLocaleString()}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {meds.find((m) => m.id === log.med_id)?.name ?? log.med_id} • {log.status}
                      </Text>
                    </View>
                  ))}
              </ScrollView>
            </Card.Content>
          </Card>
        )}
      </Portal>
    </>
  );
}
