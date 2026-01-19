/**
 * Training Analytics Module
 * 
 * Pure functions for computing training metrics and trends.
 */

export {
  computeExerciseE1RMTrend,
  computeExerciseBestSetTrend,
  computeExerciseVolumeTrend,
  computeSessionVolumeTrend,
  computeSessionVolumeByIntent,
  computeAdherence,
  computeFatigueTrend,
  filterTrendByDateRange,
  getTrendDirection,
  computePersonalRecords,
  getTopProgressingExercises,
} from './metrics';

export {
  buildExerciseTrendSeries,
  buildSessionSummary,
  groupLogsByExercise,
} from './dataTransforms';
