/**
 * Repository for training/meditation data. Thin seam delegating to lib/api.
 * Phase 7: All training writes go through here; adds [TRAINING_WRITE] logs.
 */

import {
  listMeditations as apiListMeditations,
  createTrainingSession as apiCreateTrainingSession,
  updateTrainingSession as apiUpdateTrainingSession,
  updateTrainingSessionItem as apiUpdateTrainingSessionItem,
  logTrainingSet as apiLogTrainingSet,
  updateTrainingSetLog as apiUpdateTrainingSetLog,
  logTrainingEvent as apiLogTrainingEvent,
  deleteTrainingSession as apiDeleteTrainingSession,
  type MeditationSession,
} from '@/lib/api';
import { logger } from '@/lib/logger';

export async function listMeditations(): Promise<MeditationSession[]> {
  logger.debug('[REPO_SEAM] TrainingRepository.listMeditations');
  return apiListMeditations();
}

export async function createTrainingSession(
  input: Parameters<typeof apiCreateTrainingSession>[0]
): Promise<ReturnType<typeof apiCreateTrainingSession>> {
  logger.debug('[TRAINING_WRITE] createTrainingSession', { id: input.id });
  return apiCreateTrainingSession(input);
}

export async function updateTrainingSession(
  id: string,
  updates: Parameters<typeof apiUpdateTrainingSession>[1]
): Promise<ReturnType<typeof apiUpdateTrainingSession>> {
  logger.debug('[TRAINING_WRITE] updateTrainingSession', { id });
  return apiUpdateTrainingSession(id, updates);
}

export async function updateTrainingSessionItem(
  itemId: string,
  updates: Parameters<typeof apiUpdateTrainingSessionItem>[1]
): Promise<ReturnType<typeof apiUpdateTrainingSessionItem>> {
  logger.debug('[TRAINING_WRITE] updateTrainingSessionItem', { itemId });
  return apiUpdateTrainingSessionItem(itemId, updates);
}

export async function logTrainingSet(
  input: Parameters<typeof apiLogTrainingSet>[0]
): Promise<ReturnType<typeof apiLogTrainingSet>> {
  logger.debug('[TRAINING_WRITE] logTrainingSet', { id: input.id, sessionItemId: input.sessionItemId });
  return apiLogTrainingSet(input);
}

export async function updateTrainingSetLog(
  id: string,
  updates: Parameters<typeof apiUpdateTrainingSetLog>[1]
): Promise<ReturnType<typeof apiUpdateTrainingSetLog>> {
  logger.debug('[TRAINING_WRITE] updateTrainingSetLog', { id });
  return apiUpdateTrainingSetLog(id, updates);
}

export async function logTrainingEvent(
  eventName: string,
  payload?: Record<string, any>
): Promise<ReturnType<typeof apiLogTrainingEvent>> {
  logger.debug('[TRAINING_WRITE] logTrainingEvent', { eventName });
  return apiLogTrainingEvent(eventName, payload);
}

export async function deleteTrainingSession(id: string): Promise<void> {
  logger.debug('[TRAINING_WRITE] deleteTrainingSession', { id });
  return apiDeleteTrainingSession(id);
}
