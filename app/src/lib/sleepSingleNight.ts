// C:\Reclaim\app\src\lib\sleepSingleNight.ts
export type Stage = 'sleep' | 'wake' | 'unknown';

export type NightSamples = {
  // All arrays must be same length; sampled at `dtSec` cadence (e.g., 30s or 60s)
  t: number[];           // epoch ms
  stage?: Stage[];       // if you have a sleep/wake hypnogram
  hr?: number[];         // bpm
  rmssd?: number[];      // ms (optional)
  accelRMS?: number[];   // g (rms accel magnitude)
  lightLux?: number[];   // ambient light in lux (optional)
};

export type ContextSignals = {
  // Optional external events
  alarmEpochMs?: number | null;  // alarm fired at this time
  screenOnEpochMs?: number | null;
  firstStepEpochMs?: number | null; // pedometer step onset
};

export type OneNightWakeEstimate = {
  wakeEpochMs: number | null;     // estimated natural wake (start of sustained wake)
  isSpontaneous: boolean;         // likely natural vs forced
  confidence: number;             // 0..1
  features: {
    sustainedWakeMin: number;
    hrRiseBpm: number | null;
    accelBurst: number | null;
    lightRiseLux: number | null;
    alarmDeltaMin: number | null;
  };
};

function idxOfSustainedWake(
  stage: Stage[] | undefined,
  accelRMS: number[] | undefined,
  hr: number[] | undefined,
  minSustainMin = 12,
  dtSec = 60
): number | null {
  const n = (stage ?? accelRMS ?? hr)?.length ?? 0;
  if (!n) return null;
  const win = Math.max(1, Math.round((minSustainMin * 60) / dtSec));

  // Build a crude wake signal even if no stages: motion or HR above baseline
  let wakeSignal: number[] = new Array(n).fill(0);
  if (stage) {
    for (let i = 0; i < n; i++) wakeSignal[i] = stage[i] === 'wake' ? 1 : 0;
  } else if (accelRMS) {
    const med = median(accelRMS);
    for (let i = 0; i < n; i++) wakeSignal[i] = accelRMS[i] > med * 1.8 ? 1 : 0;
  } else if (hr) {
    const base = percentile(hr, 0.3);
    for (let i = 0; i < n; i++) wakeSignal[i] = hr[i] > base + 6 ? 1 : 0;
  }

  // scan from the end to find first index where we have sustained wake
  for (let i = n - win; i >= 0; i--) {
    let ones = 0;
    for (let k = 0; k < win; k++) ones += wakeSignal[i + k];
    if (ones >= win * 0.9) return i; // ≥90% of the window is wake-like
  }
  return null;
}

function windowStatDelta(arr: number[] | undefined, centerIdx: number, dtSec: number, preMin: number, postMin: number) {
  if (!arr || !arr.length) return null;
  const pre = Math.max(0, centerIdx - Math.round((preMin * 60) / dtSec));
  const post = Math.min(arr.length - 1, centerIdx + Math.round((postMin * 60) / dtSec));
  const preMean = mean(arr.slice(pre, centerIdx));
  const postMean = mean(arr.slice(centerIdx, post));
  return postMean - preMean;
}

export function estimateNaturalWakeFromNight(
  night: NightSamples,
  ctx: ContextSignals = {}
): OneNightWakeEstimate {
  const n = night.t.length;
  if (!n) {
    return { wakeEpochMs: null, isSpontaneous: false, confidence: 0, features: {
      sustainedWakeMin: 0, hrRiseBpm: null, accelBurst: null, lightRiseLux: null, alarmDeltaMin: null
    }};
  }
  // approximate dt from timestamps
  const dtSec = n > 1 ? Math.max(1, Math.round((night.t[1] - night.t[0]) / 1000)) : 60;

  const idx = idxOfSustainedWake(night.stage, night.accelRMS, night.hr, 12, dtSec);
  if (idx == null) {
    return { wakeEpochMs: null, isSpontaneous: false, confidence: 0.15, features: {
      sustainedWakeMin: 0, hrRiseBpm: null, accelBurst: null, lightRiseLux: null, alarmDeltaMin: null
    }};
  }

  const wakeEpochMs = night.t[idx];
  const sustainedWakeMin = 12;

  // Features
  const hrRise = windowStatDelta(night.hr, idx, dtSec, 10, 10);            // bpm increase
  const accelRise = windowStatDelta(night.accelRMS, idx, dtSec, 5, 5);     // g delta
  const lightRise = windowStatDelta(night.lightLux, idx, dtSec, 10, 10);   // lux delta

  // Proximity to external “forced” signals
  const alarmDeltaMin = ctx.alarmEpochMs ? Math.abs(wakeEpochMs - ctx.alarmEpochMs) / 60000 : null;
  const screenDeltaMin = ctx.screenOnEpochMs ? Math.abs(wakeEpochMs - ctx.screenOnEpochMs) / 60000 : null;
  const stepDeltaMin = ctx.firstStepEpochMs ? Math.abs(wakeEpochMs - ctx.firstStepEpochMs) / 60000 : null;

  // Scoring (0..1)
  let score = 0;
  let weight = 0;

  // No alarm near wake → boosts spontaneity
  if (alarmDeltaMin != null) { score += clamp01(1 - Math.exp(-Math.max(0, alarmDeltaMin - 2) / 5)); weight += 1.0; }
  else { score += 0.6; weight += 1.0; } // unknown alarm → moderate prior

  // Gradual HR rise supports spontaneity
  if (hrRise != null) { score += clamp01((hrRise + 4) / 12); weight += 0.8; } // -4..+8 bpm → 0..1

  // Light increase prior to movement supports natural dawn wake
  if (lightRise != null) { score += clamp01(lightRise / 50); weight += 0.6; }

  // Motion: huge abrupt spike exactly at wake suggests alarm/forced → penalize
  if (accelRise != null) { score += clamp01(1 - clamp01((accelRise - 0.03) / 0.08)); weight += 0.6; }

  // Screen/steps exactly at wake suggests forced (penalize if within 2 min)
  const minAux = Math.min(
    alarmDeltaMin ?? 999, screenDeltaMin ?? 999, stepDeltaMin ?? 999
  );
  if (minAux < 2) { score *= 0.7; }

  const confidence = weight > 0 ? clamp01(score / weight) : 0.3;
  const isSpontaneous = confidence >= 0.55;

  return {
    wakeEpochMs,
    isSpontaneous,
    confidence,
    features: {
      sustainedWakeMin,
      hrRiseBpm: hrRise ?? null,
      accelBurst: accelRise ?? null,
      lightRiseLux: lightRise ?? null,
      alarmDeltaMin,
    },
  };
}

/* ── small utils ─────────────────────────────────────────── */
function mean(xs: number[]) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }
function median(xs: number[]) {
  if (!xs.length) return 0;
  const a = xs.slice().sort((a,b)=>a-b); const m = Math.floor(a.length/2);
  return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
}
function percentile(xs: number[], p: number) {
  if (!xs.length) return 0;
  const a = xs.slice().sort((a,b)=>a-b);
  const idx = Math.max(0, Math.min(a.length-1, Math.floor(p * (a.length - 1))));
  return a[idx];
}
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
