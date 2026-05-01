/**
 * therapistReport.ts
 *
 * Generates a professional PDF report of the user's health data
 * for sharing with a therapist, GP, or psychiatrist.
 *
 * Uses expo-print for PDF generation and expo-sharing for export.
 * Premium-gated via usePremium.
 *
 * Sections:
 *   1. Mood — 30-day trend, average, recent low days
 *   2. Sleep — 14-day average, consistency, last night
 *   3. Medications — 7-day adherence %
 *   4. Recent Insights — top 5 signals fired in the last week
 *   5. Training activity — sessions this week
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { logger } from '@/lib/logger';
import type { InsightMatch } from '@/lib/insights/InsightEngine';
import type { MoodCheckin, SleepSession, MedDoseLog } from '@/lib/api';

export type ReportData = {
  userName?: string;
  generatedAt: string;
  moods: MoodCheckin[];
  sleepSessions: SleepSession[];
  medLogs: MedDoseLog[];
  insights: InsightMatch[];
  trainingSessionCount: number;
};

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function fmtNum(n: number | null, dp = 1): string {
  if (n === null) return 'N/A';
  return n.toFixed(dp);
}

function moodToLabel(score: number): string {
  if (score >= 4.5) return 'Excellent';
  if (score >= 3.5) return 'Good';
  if (score >= 2.5) return 'Moderate';
  if (score >= 1.5) return 'Low';
  return 'Very Low';
}

function buildHtml(data: ReportData): string {
  const { userName, generatedAt, moods, sleepSessions, medLogs, insights, trainingSessionCount } = data;

  // ── Mood section ──────────────────────────────
  const moodValues = moods
    .map((m) => (m as any)?.rating ?? (m as any)?.mood ?? null)
    .filter((v): v is number => typeof v === 'number');
  const moodAvg = avg(moodValues);
  const moodLowDays = moodValues.filter((v) => v <= 2).length;
  const moodHighDays = moodValues.filter((v) => v >= 4).length;

  // Simple trend: compare latest 7 days vs prior 7 days
  const recent7 = avg(moodValues.slice(0, 7));
  const prior7 = avg(moodValues.slice(7, 14));
  const trendText =
    recent7 !== null && prior7 !== null
      ? recent7 > prior7 + 0.3
        ? '↑ Improving'
        : recent7 < prior7 - 0.3
        ? '↓ Declining'
        : '→ Stable'
      : 'Insufficient data';

  // ── Sleep section ──────────────────────────────
  const sleepHours = sleepSessions
    .slice(0, 14)
    .map((s) => {
      if (!s.start_time || !s.end_time) return null;
      const ms = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
      return ms > 0 ? ms / 3600000 : null;
    })
    .filter((v): v is number => v !== null);
  const sleepAvg = avg(sleepHours);
  const sleepBelowTarget = sleepHours.filter((h) => h < 7).length;
  const lastSleep = sleepSessions[0];
  const lastSleepHours =
    lastSleep?.start_time && lastSleep?.end_time
      ? ((new Date(lastSleep.end_time).getTime() - new Date(lastSleep.start_time).getTime()) / 3600000).toFixed(1)
      : null;

  // ── Meds section ──────────────────────────────
  const takenCount = medLogs.filter((l) => (l as any).status === 'taken').length;
  const totalLogs = medLogs.length;
  const adherencePct = totalLogs > 0 ? Math.round((takenCount / totalLogs) * 100) : null;

  // ── Insights section ──────────────────────────
  const topInsights = insights.slice(0, 5);

  const css = `
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 32px; }
    h1 { font-size: 24px; font-weight: 800; color: #4f46e5; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 32px; }
    h2 { font-size: 16px; font-weight: 700; color: #4f46e5; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 28px; }
    .stat-row { display: flex; gap: 24px; flex-wrap: wrap; margin: 12px 0; }
    .stat { background: #f5f3ff; border-radius: 10px; padding: 12px 16px; min-width: 120px; }
    .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
    .stat-value { font-size: 22px; font-weight: 800; color: #4f46e5; margin: 2px 0; }
    .stat-sub { font-size: 11px; color: #9ca3af; }
    .insight-row { border-left: 3px solid #4f46e5; padding-left: 12px; margin: 12px 0; }
    .insight-msg { font-size: 13px; font-weight: 600; }
    .insight-action { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-right: 4px; }
    .pill-green { background: #d1fae5; color: #065f46; }
    .pill-amber { background: #fef3c7; color: #92400e; }
    .pill-red { background: #fee2e2; color: #991b1b; }
  `;

  const moodPillClass =
    moodAvg !== null
      ? moodAvg >= 3.5
        ? 'pill-green'
        : moodAvg >= 2.5
        ? 'pill-amber'
        : 'pill-red'
      : 'pill-amber';

  const adherencePillClass =
    adherencePct !== null
      ? adherencePct >= 80
        ? 'pill-green'
        : adherencePct >= 60
        ? 'pill-amber'
        : 'pill-red'
      : 'pill-amber';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${css}</style></head>
<body>
<h1>Reclaim Health Report</h1>
<div class="subtitle">
  ${userName ? `Patient: ${userName} &nbsp;|&nbsp; ` : ''}
  Generated: ${fmtDate(generatedAt)} &nbsp;|&nbsp;
  Period: 30-day summary
</div>

<h2>Mood</h2>
<div class="stat-row">
  <div class="stat">
    <div class="stat-label">30-day average</div>
    <div class="stat-value">${fmtNum(moodAvg)}<span style="font-size:14px;color:#9ca3af">/5</span></div>
    <div class="stat-sub">${moodAvg !== null ? moodToLabel(moodAvg) : '—'}</div>
  </div>
  <div class="stat">
    <div class="stat-label">Trend (last 7 days)</div>
    <div class="stat-value" style="font-size:18px">${trendText}</div>
    <div class="stat-sub">vs prior 7-day period</div>
  </div>
  <div class="stat">
    <div class="stat-label">Low mood days (≤ 2)</div>
    <div class="stat-value">${moodLowDays}</div>
    <div class="stat-sub">of ${moodValues.length} logged</div>
  </div>
  <div class="stat">
    <div class="stat-label">Good mood days (≥ 4)</div>
    <div class="stat-value">${moodHighDays}</div>
    <div class="stat-sub">of ${moodValues.length} logged</div>
  </div>
</div>

<h2>Sleep</h2>
<div class="stat-row">
  <div class="stat">
    <div class="stat-label">14-day average</div>
    <div class="stat-value">${sleepAvg !== null ? sleepAvg.toFixed(1) : 'N/A'}<span style="font-size:14px;color:#9ca3af">h</span></div>
    <div class="stat-sub">target: 7–9h</div>
  </div>
  <div class="stat">
    <div class="stat-label">Last night</div>
    <div class="stat-value">${lastSleepHours ?? 'N/A'}<span style="font-size:14px;color:#9ca3af">h</span></div>
    <div class="stat-sub">${lastSleep?.start_time ? fmtDate(lastSleep.start_time) : '—'}</div>
  </div>
  <div class="stat">
    <div class="stat-label">Below 7h nights</div>
    <div class="stat-value">${sleepBelowTarget}</div>
    <div class="stat-sub">of ${sleepHours.length} tracked</div>
  </div>
</div>

<h2>Medications</h2>
<div class="stat-row">
  <div class="stat">
    <div class="stat-label">7-day adherence</div>
    <div class="stat-value">${adherencePct !== null ? adherencePct + '%' : 'N/A'}</div>
    <div class="stat-sub"><span class="pill ${adherencePillClass}">${adherencePct !== null ? (adherencePct >= 80 ? 'On track' : adherencePct >= 60 ? 'Needs attention' : 'Significant gaps') : 'No data'}</span></div>
  </div>
  <div class="stat">
    <div class="stat-label">Doses taken</div>
    <div class="stat-value">${takenCount}</div>
    <div class="stat-sub">of ${totalLogs} scheduled</div>
  </div>
</div>

<h2>Training Activity</h2>
<div class="stat-row">
  <div class="stat">
    <div class="stat-label">Sessions this week</div>
    <div class="stat-value">${trainingSessionCount}</div>
  </div>
</div>

${topInsights.length > 0 ? `
<h2>Recent Insights (Top Signals)</h2>
<p style="font-size:12px;color:#6b7280;margin-bottom:12px">The following signals were generated by Reclaim's insight engine based on the patient's logged data.</p>
${topInsights
  .map(
    (ins) => `
<div class="insight-row">
  <div class="insight-msg"><span class="pill pill-green">${ins.sourceTag?.replace(/_/g, ' ') ?? 'signal'}</span> ${ins.message}</div>
  ${ins.action ? `<div class="insight-action">Suggested action: ${ins.action}</div>` : ''}
  ${ins.why ? `<div class="insight-action" style="margin-top:4px;font-style:italic">${ins.why}</div>` : ''}
</div>`,
  )
  .join('')}
` : ''}

<div class="footer">
  This report was generated by Reclaim — a personal health insight app. Data reflects self-reported and device-sourced information.
  All insights are informational only and do not constitute medical advice.
  Generated: ${generatedAt}
</div>
</body>
</html>`;
}

export async function generateAndShareTherapistReport(data: ReportData): Promise<void> {
  try {
    const html = buildHtml(data);

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      logger.warn('[TherapistReport] sharing not available on this device');
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share your Reclaim health report',
    });
  } catch (e) {
    logger.warn('[TherapistReport] export failed:', e);
    throw e;
  }
}
