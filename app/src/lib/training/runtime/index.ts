/**
 * Training Runtime Module
 * 
 * Provides session state management and autoregulation for active workouts.
 */

export {
  initializeRuntime,
  resumeRuntime,
  tickRuntime,
  logSet,
  updateLoggedSetInRuntime,
  replaceExerciseInRuntime,
  endSession,
  getAdjustedSetParams,
} from './sessionRuntime';

export {
  applyAutoregulation,
  detectSessionFatigue,
  getAdjustedRestTime,
} from './autoregulation';

export {
  buildSetLogPayload,
  buildSetLogQueuePayload,
} from './payloadBuilder';

export type {
  AutoregulationInput,
  AutoregulationResult,
} from './autoregulation';
