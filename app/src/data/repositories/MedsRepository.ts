/**
 * Meds domain repository. Thin delegator to lib/api.
 */

import { logger } from '@/lib/logger';
import * as api from '@/lib/api';

export type { Med, MedLog, MedDoseLog, MedicationEvent } from '@/lib/api';

export async function listMeds() {
  logger.debug('[REPO_SEAM] MedsRepository.listMeds');
  return api.listMeds();
}

export async function upsertMed(m: Parameters<typeof api.upsertMed>[0]) {
  logger.debug('[REPO_SEAM] MedsRepository.upsertMed');
  return api.upsertMed(m);
}

export async function deleteMed(id: string) {
  logger.debug('[REPO_SEAM] MedsRepository.deleteMed');
  return api.deleteMed(id);
}

export async function logMedDose(input: Parameters<typeof api.logMedDose>[0]) {
  logger.debug('[REPO_SEAM] MedsRepository.logMedDose');
  return api.logMedDose(input);
}

export async function listMedLogsLastNDays(days = 7) {
  logger.debug('[REPO_SEAM] MedsRepository.listMedLogsLastNDays');
  return api.listMedLogsLastNDays(days);
}

export async function listMedicationEvents(days = 30) {
  logger.debug('[REPO_SEAM] MedsRepository.listMedicationEvents');
  return api.listMedicationEvents(days);
}

export async function listMedDoseLogsRemoteLastNDays(days = 7) {
  logger.debug('[REPO_SEAM] MedsRepository.listMedDoseLogsRemoteLastNDays');
  return api.listMedDoseLogsRemoteLastNDays(days);
}
