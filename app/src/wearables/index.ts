/**
 * Wearables module - glance models, projection, and delivery interfaces for watch surfaces.
 * Phase 8: Types and projection. Phase 9: RecoverySummaryCard, MoodCheckinCard, delivery stubs.
 */

export { projectTrainingNextAction, projectRecoverySummary, projectMoodCheckin } from './WearablesProjectionService';
export { AppleWatchDeliveryAdapter, WearOSDeliveryAdapter } from './WearablesDeliveryService';
export type { IWearablesDeliveryAdapter } from './WearablesDeliveryService';
export type {
  DomainSnapshot,
  TrainingNextActionCard,
  RecoverySummaryCard,
  MoodCheckinCard,
  WearableGlanceModel,
} from './models';
