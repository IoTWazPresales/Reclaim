export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '0:0').split(':').map((x) => parseInt(x, 10));
  const H = isFinite(h) ? Math.max(0, Math.min(23, h)) : 0;
  const M = isFinite(m) ? Math.max(0, Math.min(59, m)) : 0;
  return H * 60 + M;
}
export function minutesToHHMM(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** circular mean over 24h clock to avoid wrap issues */
export function circularMeanHHMM(values: string[]): string | null {
  if (!values.length) return null;
  let X = 0, Y = 0;
  for (const v of values) {
    const m = hhmmToMinutes(v);
    const a = (m / 1440) * 2 * Math.PI;
    X += Math.cos(a); Y += Math.sin(a);
  }
  const angle = Math.atan2(Y, X);
  const frac = (angle < 0 ? angle + 2 * Math.PI : angle) / (2 * Math.PI);
  return minutesToHHMM(Math.round(frac * 1440));
}

export function rollingAverageHHMM(datesHHMM: Array<{ date: string; hhmm: string }>, days = 14): string | null {
  if (!datesHHMM.length) return null;
  // take last `days`
  const last = datesHHMM.slice(-days);
  const vals = last.map((d) => d.hhmm);
  return circularMeanHHMM(vals);
}
