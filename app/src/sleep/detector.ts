// app/src/sleep/detector.ts
export type PhoneSignals = {
  phoneInactiveStart?: Date;  // later: capture when screen last went off at night
  phoneActiveResume?: Date;   // later: capture first unlock in morning
};

function guessWake(now: Date, typical?: string | null) {
  const d = new Date(now);
  if (typical) {
    const [hh, mm] = typical.split(':').map(Number);
    d.setHours(hh ?? 7, mm ?? 0, 0, 0);
  } else {
    d.setHours(7, 0, 0, 0);
  }
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 1);
  return d;
}

export function inferSleepWindow(now: Date, typicalWake?: string | null, signals: PhoneSignals = {}) {
  const end = signals.phoneActiveResume ?? guessWake(now, typicalWake);
  const start = signals.phoneInactiveStart ?? new Date(end.getTime() - 7.5 * 3600 * 1000);
  const confidence = signals.phoneActiveResume && signals.phoneInactiveStart ? 0.8 : 0.5;
  return { start, end, confidence, ctx: { signals } };
}
