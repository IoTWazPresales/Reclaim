/**
 * Wearable glance models - compact representations for watch surfaces.
 * Phase 8: TrainingNextActionCard. Phase 9: RecoverySummaryCard, MoodCheckinCard.
 */

import type { ProgramDayRow, ProgramInstanceRow, TrainingProfileRow } from '@/lib/api';

/**
 * Input snapshot of domain state for projection.
 * Caller provides this; projection service does not perform DB queries.
 */
export interface DomainSnapshot {
  profile: TrainingProfileRow | null;
  activeProgram: ProgramInstanceRow | null;
  programDays: ProgramDayRow[];
  /** If set, indicates a session is in progress (started but not ended) */
  inProgressSession: { id: string; started_at: string } | null;
  /** Phase 9: Recovery progress (from getRecoveryProgress) */
  recoveryProgress?: {
    currentStageId: string;
    completedStageIds: string[];
    currentWeek?: number;
  } | null;
  /** Phase 9: Latest mood entry (from latestMood / listMoodCheckinsDays) */
  latestMood?: { rating: number; created_at: string } | null;
}

/**
 * Training next action card - what to show on a watch for "next workout".
 */
export interface TrainingNextActionCard {
  type: 'training_next_action';
  /** Short label e.g. "Push" or "Push (Chest Focus)" */
  label: string;
  /** ISO date string of the session day */
  date: string;
  /** Human-readable date e.g. "Mon 27 Jan" */
  dateDisplay: string;
  /** Template key e.g. "push", "pull", "legs" */
  templateKey: string;
  /** Estimated duration in minutes */
  estimatedMinutes: number;
}

/**
 * Recovery summary card - compact recovery stage status for watch.
 */
export interface RecoverySummaryCard {
  type: 'recovery_summary';
  stageId: string;
  stageTitle: string;
  currentWeek: number;
  completedStageCount: number;
}

/**
 * Mood check-in card - prompt for daily mood check-in on watch.
 */
export interface MoodCheckinCard {
  type: 'mood_checkin';
  needsCheckin: boolean;
  lastMood?: number;
  lastCheckinDate?: string;
}

/**
 * Union of all wearable glance model types.
 */
export type WearableGlanceModel = TrainingNextActionCard | RecoverySummaryCard | MoodCheckinCard;
