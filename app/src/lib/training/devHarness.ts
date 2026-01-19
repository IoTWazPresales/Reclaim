// Training Module - Edge Case Test Harness
// Run this in dev builds to test edge cases and verify deterministic behavior
import { buildSession, suggestLoading, adaptSession, chooseExercise } from './engine';
import { getExerciseCatalog } from './engine';
import type {
  BuildSessionInput,
  TrainingGoal,
  SessionTemplate,
  TrainingConstraints,
  UserState,
  ExperienceLevel,
  SessionState,
  AdaptSessionInput,
} from './types';
import { logger } from '../logger';

interface TestResult {
  scenario: string;
  passed: boolean;
  warnings: string[];
  errors: string[];
  output: any;
}

/**
 * Run all edge case tests
 */
export async function runTrainingHarness(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: No profile present (fallback)
  results.push(await testNoProfile());

  // Test 2: Profile missing optional fields
  results.push(await testProfileMissingFields());

  // Test 3: Bodyweight-only equipment
  results.push(await testBodyweightOnly());

  // Test 4: Time budget 20 minutes (time compression)
  results.push(await testTimeCompression());

  // Test 5: Extreme constraints (no overhead, no hinge)
  results.push(await testExtremeConstraints());

  // Test 6: Skip primary lift mid-session (adaptation)
  results.push(await testSkipPrimaryLift());

  // Test 7: Network failure simulation (offline fallback)
  results.push(await testOfflineFallback());

  return results;
}

/**
 * Test 1: No profile present (fallback)
 */
async function testNoProfile(): Promise<TestResult> {
  const scenario = 'No profile present (fallback)';
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const input: BuildSessionInput = {
      template: 'full_body',
      goals: {
        build_muscle: 0.5,
        build_strength: 0.3,
        lose_fat: 0.2,
        get_fitter: 0.0,
      },
      constraints: {
        availableEquipment: ['barbell', 'dumbbells'],
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 60,
      },
      userState: {
        experienceLevel: 'intermediate',
      },
    };

    const plan = buildSession(input);

    if (plan.exercises.length === 0) {
      errors.push('No exercises generated');
    }

    if (plan.exercises.length > 10) {
      warnings.push(`Many exercises generated: ${plan.exercises.length}`);
    }

    return {
      scenario,
      passed: errors.length === 0,
      warnings,
      errors,
      output: {
        exercisesCount: plan.exercises.length,
        estimatedDuration: plan.estimatedDurationMinutes,
        intents: plan.exercises.map((e) => e.intents).flat(),
      },
    };
  } catch (error: any) {
    return {
      scenario,
      passed: false,
      warnings,
      errors: [...errors, error.message || 'Unknown error'],
      output: null,
    };
  }
}

/**
 * Test 2: Profile missing optional fields
 */
async function testProfileMissingFields(): Promise<TestResult> {
  const scenario = 'Profile missing optional fields';
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const input: BuildSessionInput = {
      template: 'upper',
      goals: {
        build_muscle: 0.6,
        build_strength: 0.4,
        lose_fat: 0.0,
        get_fitter: 0.0,
      },
      constraints: {
        availableEquipment: [], // Empty - should handle gracefully
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 45,
      },
      userState: {
        experienceLevel: 'beginner',
        // No estimated1RM, no lastSessionPerformance
      },
    };

    const plan = buildSession(input);

    if (plan.exercises.length === 0) {
      warnings.push('No exercises generated with empty equipment - may be expected');
    }

    return {
      scenario,
      passed: true,
      warnings,
      errors,
      output: {
        exercisesCount: plan.exercises.length,
        usedDefaults: plan.exercises.every((e) => {
          const weight = e.plannedSets[0]?.suggestedWeight || 0;
          return weight === 0 || weight < 50; // Likely using defaults
        }),
      },
    };
  } catch (error: any) {
    return {
      scenario,
      passed: false,
      warnings,
      errors: [...errors, error.message || 'Unknown error'],
      output: null,
    };
  }
}

/**
 * Test 3: Bodyweight-only equipment
 */
async function testBodyweightOnly(): Promise<TestResult> {
  const scenario = 'Bodyweight-only equipment';
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const input: BuildSessionInput = {
      template: 'full_body',
      goals: {
        build_muscle: 0.4,
        build_strength: 0.2,
        lose_fat: 0.2,
        get_fitter: 0.2,
      },
      constraints: {
        availableEquipment: [], // Bodyweight only
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 30,
      },
      userState: {
        experienceLevel: 'intermediate',
      },
    };

    const plan = buildSession(input);

    const hasBodyweight = plan.exercises.some((e) => {
      return e.exercise.equipment.length === 0 || e.exercise.equipment.includes('bodyweight');
    });

    if (!hasBodyweight && plan.exercises.length > 0) {
      warnings.push('No bodyweight exercises found despite bodyweight-only constraint');
    }

    return {
      scenario,
      passed: errors.length === 0,
      warnings,
      errors,
      output: {
        exercisesCount: plan.exercises.length,
        bodyweightExercises: plan.exercises.filter(
          (e) => e.exercise.equipment.length === 0,
        ).length,
      },
    };
  } catch (error: any) {
    return {
      scenario,
      passed: false,
      warnings,
      errors: [...errors, error.message || 'Unknown error'],
      output: null,
    };
  }
}

/**
 * Test 4: Time budget 20 minutes (time compression)
 */
async function testTimeCompression(): Promise<TestResult> {
  const scenario = 'Time budget 20 minutes (time compression)';
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const input: BuildSessionInput = {
      template: 'full_body',
      goals: {
        build_muscle: 0.5,
        build_strength: 0.5,
        lose_fat: 0.0,
        get_fitter: 0.0,
      },
      constraints: {
        availableEquipment: ['barbell', 'dumbbells', 'bench'],
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 20, // Very short
      },
      userState: {
        experienceLevel: 'intermediate',
      },
    };

    const plan = buildSession(input);

    if (plan.estimatedDurationMinutes > 25) {
      warnings.push(`Estimated duration (${plan.estimatedDurationMinutes}min) exceeds budget (20min)`);
    }

    if (plan.exercises.length > 5) {
      warnings.push(`Many exercises (${plan.exercises.length}) for short time budget`);
    }

    // Test adaptation
    const sessionState: SessionState = {
      sessionId: 'test',
      plan,
      startedAt: new Date().toISOString(),
      currentExerciseIndex: 2,
      completedExercises: [],
      skippedExercises: [],
      loggedSets: {},
      elapsedTimeSeconds: 15 * 60, // 15 minutes elapsed
      mode: 'timed',
    };

    const adapted = adaptSession({
      sessionState,
      reason: 'time_pressure',
    });

    if (adapted.exercises.length >= plan.exercises.length) {
      warnings.push('Adaptation did not reduce exercise count under time pressure');
    }

    return {
      scenario,
      passed: errors.length === 0,
      warnings,
      errors,
      output: {
        originalExercises: plan.exercises.length,
        adaptedExercises: adapted.exercises.length,
        originalDuration: plan.estimatedDurationMinutes,
        adaptedDuration: adapted.estimatedDurationMinutes,
      },
    };
  } catch (error: any) {
    return {
      scenario,
      passed: false,
      warnings,
      errors: [...errors, error.message || 'Unknown error'],
      output: null,
    };
  }
}

/**
 * Test 5: Extreme constraints (no overhead, no hinge)
 */
async function testExtremeConstraints(): Promise<TestResult> {
  const scenario = 'Extreme constraints (no overhead, no hinge)';
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const input: BuildSessionInput = {
      template: 'upper',
      goals: {
        build_muscle: 0.5,
        build_strength: 0.5,
        lose_fat: 0.0,
        get_fitter: 0.0,
      },
      constraints: {
        availableEquipment: ['dumbbells', 'bench'],
        injuries: ['shoulder'],
        forbiddenMovements: ['vertical_press', 'hip_hinge'],
        timeBudgetMinutes: 45,
      },
      userState: {
        experienceLevel: 'intermediate',
      },
    };

    const plan = buildSession(input);

    const hasForbidden = plan.exercises.some((e) => {
      return (
        e.intents.includes('vertical_press') || e.intents.includes('hip_hinge')
      );
    });

    if (hasForbidden) {
      errors.push('Forbidden movements found in plan');
    }

    if (plan.exercises.length === 0) {
      warnings.push('No exercises generated with extreme constraints - may be too restrictive');
    }

    return {
      scenario,
      passed: errors.length === 0,
      warnings,
      errors,
      output: {
        exercisesCount: plan.exercises.length,
        intents: plan.exercises.map((e) => e.intents).flat(),
      },
    };
  } catch (error: any) {
    return {
      scenario,
      passed: false,
      warnings,
      errors: [...errors, error.message || 'Unknown error'],
      output: null,
    };
  }
}

/**
 * Test 6: Skip primary lift mid-session (adaptation)
 */
async function testSkipPrimaryLift(): Promise<TestResult> {
  const scenario = 'Skip primary lift mid-session (adaptation)';
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const input: BuildSessionInput = {
      template: 'push',
      goals: {
        build_muscle: 0.6,
        build_strength: 0.4,
        lose_fat: 0.0,
        get_fitter: 0.0,
      },
      constraints: {
        availableEquipment: ['barbell', 'bench'],
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 60,
      },
      userState: {
        experienceLevel: 'intermediate',
      },
    };

    const plan = buildSession(input);

    const primaryExercise = plan.exercises.find((e) => e.priority === 'primary');
    if (!primaryExercise) {
      warnings.push('No primary exercise found');
    }

    const sessionState: SessionState = {
      sessionId: 'test',
      plan,
      startedAt: new Date().toISOString(),
      currentExerciseIndex: 1,
      completedExercises: [],
      skippedExercises: primaryExercise ? [primaryExercise.exerciseId] : [],
      loggedSets: {},
      elapsedTimeSeconds: 10 * 60,
      mode: 'timed',
    };

    const adapted = adaptSession({
      sessionState,
      reason: 'fatigue',
    });

    if (adapted.exercises.length === plan.exercises.length) {
      warnings.push('Adaptation did not adjust after skipping primary lift');
    }

    return {
      scenario,
      passed: errors.length === 0,
      warnings,
      errors,
      output: {
        originalExercises: plan.exercises.length,
        adaptedExercises: adapted.exercises.length,
        skippedPrimary: !!primaryExercise,
      },
    };
  } catch (error: any) {
    return {
      scenario,
      passed: false,
      warnings,
      errors: [...errors, error.message || 'Unknown error'],
      output: null,
    };
  }
}

/**
 * Test 7: Network failure simulation (offline fallback)
 */
async function testOfflineFallback(): Promise<TestResult> {
  const scenario = 'Network failure simulation (offline fallback)';
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // This test verifies that the system can generate sessions without network
    // The actual offline queue is tested in Phase 8
    const input: BuildSessionInput = {
      template: 'full_body',
      goals: {
        build_muscle: 0.5,
        build_strength: 0.3,
        lose_fat: 0.2,
        get_fitter: 0.0,
      },
      constraints: {
        availableEquipment: ['barbell', 'dumbbells'],
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 60,
      },
      userState: {
        experienceLevel: 'intermediate',
        // No lastSessionPerformance (simulating offline/no history)
      },
    };

    const plan = buildSession(input);

    // Verify plan is complete and serializable
    const serialized = JSON.stringify(plan);
    if (serialized.length > 100000) {
      warnings.push('Plan serialization is large - may cause offline storage issues');
    }

    return {
      scenario,
      passed: errors.length === 0,
      warnings,
      errors,
      output: {
        exercisesCount: plan.exercises.length,
        serializedSize: serialized.length,
        canSerialize: true,
      },
    };
  } catch (error: any) {
    return {
      scenario,
      passed: false,
      warnings,
      errors: [...errors, error.message || 'Unknown error'],
      output: null,
    };
  }
}

/**
 * Log test results (for dev builds)
 */
export function logHarnessResults(results: TestResult[]): void {
  if (!__DEV__) return;

  logger.info('=== Training Module Test Harness Results ===');
  results.forEach((result) => {
    logger.info(`\nScenario: ${result.scenario}`);
    logger.info(`Passed: ${result.passed}`);
    if (result.warnings.length > 0) {
      logger.warn(`Warnings: ${result.warnings.join('; ')}`);
    }
    if (result.errors.length > 0) {
      logger.error(`Errors: ${result.errors.join('; ')}`);
    }
    if (result.output) {
      logger.info(`Output: ${JSON.stringify(result.output, null, 2)}`);
    }
  });
  logger.info('\n=== End Test Harness ===');
}
