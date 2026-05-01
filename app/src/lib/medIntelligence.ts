// C:\Reclaim\app\src\lib\medIntelligence.ts

import type { MedCatalogItem } from './medCatalog';

export type MedContextInput = {
  medName: string;
  catalog?: MedCatalogItem | null;

  mood?: {
    latest?: number;          // 1-5 if available
    trend3dPct?: number;      // if available
    tags?: string[];          // if available
  };

  sleep?: {
    lastNightHours?: number;
    avg7dHours?: number;
    sparseData?: boolean;  // true if <3 days with any sessions
  };

  meds?: {
    adherencePct7d?: number;  // 0-100 if available
    missedDoses3d?: number;   // integer
    hasUnknownStatus?: boolean;  // true if some logs have unknown status
  };

  flags?: {
    stress?: boolean;
  };
};

export type MedContextNote = {
  id: string;
  title: string;       // short
  message: string;     // short + calming
  confidence: number;  // 0..1
  reasons: string[];   // concrete signals used
};

/**
 * Compute context-aware notes for a medication.
 * Returns up to 3 notes, ordered by importance.
 */
export function computeMedContextNotes(input: MedContextInput): MedContextNote[] {
  const notes: MedContextNote[] = [];

  // RULE 1: Stress/mood note
  const stressTriggered =
    input.flags?.stress === true ||
    (input.mood?.tags ?? []).some(t => /stress(ed|ful)?/i.test(t)) ||
    (input.mood?.latest !== undefined && input.mood.latest <= 2) ||
    (input.mood?.trend3dPct !== undefined && input.mood.trend3dPct <= -10);

  if (stressTriggered) {
    const reasons: string[] = [];
    let confidence = 0.8;

    if (input.flags?.stress === true) {
      reasons.push('stress_flag');
    }
    if (input.mood?.tags && input.mood.tags.some(t => /stress/i.test(t))) {
      reasons.push('stress_tag_present');
    }
    if (input.mood?.latest !== undefined && input.mood.latest <= 2) {
      reasons.push('mood_latest_low');
    }
    if (input.mood?.trend3dPct !== undefined && input.mood.trend3dPct <= -10) {
      reasons.push('mood_trend_down');
    }

    // Reduce confidence if relying on weak signals
    if (reasons.length === 1 && reasons[0] === 'stress_tag_present' && input.mood?.latest === undefined) {
      confidence = 0.6;
    }
    if (input.mood?.latest === undefined && input.mood?.trend3dPct === undefined && !input.flags?.stress) {
      confidence = 0.5; // Only tags, no numeric signals
      reasons.push('mood_sparse_data');
    }
    
    // Confidence penalty: if trend3dPct is undefined but triggered via tags only
    if (input.mood?.trend3dPct === undefined && reasons.some(r => r === 'stress_tag_present') && 
        input.mood?.latest === undefined && !input.flags?.stress) {
      confidence -= 0.15;
      reasons.push('mood_sparse_data');
    }

    notes.push({
      id: 'stress_mood',
      title: 'Mood and stress patterns',
      message: 'Medications are often part of a broader stability plan. Consistency with your medication and tracking patterns over time can help you and your clinician understand what\'s working. Some people notice that maintaining steady medication levels helps support mood stability during stressful periods.',
      confidence: Math.max(0.2, Math.min(0.9, confidence)),
      reasons,
    });
  }

  // RULE 2: Sleep note
  const sleepTriggered =
    (input.sleep?.lastNightHours !== undefined && input.sleep.lastNightHours < 6) ||
    (input.sleep?.avg7dHours !== undefined && input.sleep.avg7dHours < 6.5);

  if (sleepTriggered) {
    const reasons: string[] = [];
    let confidence = 0.8;

    if (input.sleep?.lastNightHours !== undefined && input.sleep.lastNightHours < 6) {
      reasons.push('sleep_lastNight_low');
    }
    if (input.sleep?.avg7dHours !== undefined && input.sleep.avg7dHours < 6.5) {
      reasons.push('sleep_avg7d_low');
    }

    // Reduce confidence if missing main signal
    if (input.sleep?.lastNightHours === undefined && input.sleep?.avg7dHours === undefined) {
      confidence = 0.4; // Should not trigger, but if it does, low confidence
    } else if (input.sleep?.lastNightHours === undefined || input.sleep?.avg7dHours === undefined) {
      confidence = 0.7; // Partial data
    }
    
    // Confidence penalty: if sparse data
    if (input.sleep?.sparseData === true) {
      confidence -= 0.15;
      reasons.push('sleep_sparse_data');
    }

    notes.push({
      id: 'sleep',
      title: 'Sleep and mental load',
      message: 'Sleep and mental load are tightly linked. Some people notice that medications affecting neurotransmitters can influence sleep patterns. Tracking your sleep and medication timing over time can help you and your clinician understand what\'s going on.',
      confidence: Math.max(0.2, Math.min(0.9, confidence)),
      reasons,
    });
  }

  // RULE 3: Consistency/adherence note
  const adherenceTriggered =
    (input.meds?.adherencePct7d !== undefined && input.meds.adherencePct7d < 70) ||
    (input.meds?.missedDoses3d !== undefined && input.meds.missedDoses3d >= 1);

  if (adherenceTriggered) {
    const reasons: string[] = [];
    let confidence = 0.8;

    if (input.meds?.adherencePct7d !== undefined && input.meds.adherencePct7d < 70) {
      reasons.push('adherence_low');
    }
    if (input.meds?.missedDoses3d !== undefined && input.meds.missedDoses3d >= 1) {
      reasons.push('missed_doses_recent');
    }

    // Reduce confidence if missing adherence data
    if (input.meds?.adherencePct7d === undefined && input.meds?.missedDoses3d === undefined) {
      confidence = 0.4; // Should not trigger
    }
    
    // Confidence penalty: if missedDoses3d is undefined but adherencePct7d triggered the rule
    if (input.meds?.missedDoses3d === undefined && input.meds?.adherencePct7d !== undefined && 
        input.meds.adherencePct7d < 70) {
      confidence -= 0.1;
    }
    
    // Confidence penalty: if has unknown status
    if (input.meds?.hasUnknownStatus === true) {
      confidence -= 0.1;
      reasons.push('meds_unknown_status');
    }

    notes.push({
      id: 'consistency',
      title: 'Consistency matters',
      message: 'Consistency can matter for stability. If you\'re missing doses often, it may be worth exploring barriers and discussing options with your clinician. They can help you find strategies that work for your routine.',
      confidence: Math.max(0.2, Math.min(0.9, confidence)),
      reasons,
    });
  }

  // Cap to max 3 notes, ordered by importance (stress > sleep > adherence)
  const ordered = notes.sort((a, b) => {
    const priority: Record<string, number> = {
      stress_mood: 3,
      sleep: 2,
      consistency: 1,
    };
    return (priority[b.id] ?? 0) - (priority[a.id] ?? 0);
  });

  return ordered.slice(0, 3);
}

/**
 * Get human-readable confidence label.
 */
export function confidenceLabel(c: number): 'Low' | 'Medium' | 'High' {
  if (c < 0.45) return 'Low';
  if (c < 0.75) return 'Medium';
  return 'High';
}
