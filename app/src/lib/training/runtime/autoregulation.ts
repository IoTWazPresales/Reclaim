/**
 * Autoregulation Rules Engine
 * 
 * Deterministic, rule-based autoregulation for adjusting sets during a session.
 * Every adjustment produces a trace with rule ID and explanation.
 * 
 * Rules:
 * 1. HIGH_RPE_REDUCE: If RPE >= 9, reduce weight 5% or reduce target reps by 1-2
 * 2. REPS_DROP_ADJUST: If reps drop >= 20% from target, reduce weight 5%
 * 3. STRONG_PERFORMANCE: If hit top of range with RPE <= 7, suggest slight increase
 * 4. FATIGUE_ACCUMULATION: If multiple high RPE sets, consider dropping remaining sets
 * 
 * Philosophy:
 * - Conservative: Better to under-adjust than over-adjust
 * - Traceable: Every decision logged with reason
 * - Bodyweight-safe: Never suggest negative weights
 */

import type {
  AutoregulationAdjustment,
  AdaptationReason,
  SetLogEntry,
  PlannedSet,
} from '../types';

/**
 * Input for autoregulation calculation
 */
export interface AutoregulationInput {
  exerciseId: string;
  currentSetIndex: number;
  currentSetRpe?: number;
  currentSetReps: number;
  currentSetWeight: number;
  targetReps: number;
  suggestedWeight: number;
  previousSets: SetLogEntry[];
  plannedSets: PlannedSet[];
}

/**
 * Output from autoregulation calculation
 */
export interface AutoregulationResult {
  adjustment?: AutoregulationAdjustment;
  reason: AdaptationReason;
  adjustedWeight?: number;
  adjustedReps?: number;
  message: string;
}

// ============================================================================
// RULE THRESHOLDS (Deterministic constants)
// ============================================================================

const RPE_HIGH_THRESHOLD = 9;           // RPE >= 9 triggers reduction
const RPE_VERY_HIGH_THRESHOLD = 10;     // RPE = 10 triggers larger reduction
const RPE_LOW_THRESHOLD = 7;            // RPE <= 7 could trigger increase (if hitting target)
const REPS_DROP_THRESHOLD = 0.20;       // 20% drop in reps triggers adjustment
const WEIGHT_REDUCTION_SMALL = 0.05;    // 5% weight reduction
const WEIGHT_REDUCTION_LARGE = 0.10;    // 10% weight reduction for severe fatigue
const REPS_REDUCTION_SMALL = 1;         // Reduce target by 1 rep
const REPS_REDUCTION_LARGE = 2;         // Reduce target by 2 reps
const WEIGHT_INCREASE_SMALL = 0.025;    // 2.5% increase for strong performance
const MIN_WEIGHT_KG = 0;                // Never go below 0 (bodyweight exercises)
const FATIGUE_SETS_THRESHOLD = 3;       // If 3+ sets with high RPE, flag fatigue

// ============================================================================
// MAIN AUTOREGULATION FUNCTION
// ============================================================================

/**
 * Apply autoregulation rules to determine adjustments for next set
 */
export function applyAutoregulation(input: AutoregulationInput): AutoregulationResult {
  const {
    exerciseId,
    currentSetIndex,
    currentSetRpe,
    currentSetReps,
    currentSetWeight,
    targetReps,
    suggestedWeight,
    previousSets,
  } = input;
  
  // If no RPE provided, we can't make RPE-based adjustments
  if (currentSetRpe === undefined) {
    return {
      reason: 'first_set_baseline',
      message: 'No RPE data available for autoregulation',
    };
  }
  
  // First set doesn't have previous data to compare
  if (currentSetIndex === 1 && previousSets.length === 0) {
    return checkFirstSetRpe(currentSetRpe, suggestedWeight, targetReps);
  }
  
  // Check accumulated fatigue across sets
  const fatigueResult = checkAccumulatedFatigue(previousSets, currentSetRpe);
  if (fatigueResult.adjustment) {
    return fatigueResult;
  }
  
  // Check for high RPE
  if (currentSetRpe >= RPE_VERY_HIGH_THRESHOLD) {
    return applyVeryHighRpeRule(currentSetRpe, suggestedWeight, targetReps);
  }
  
  if (currentSetRpe >= RPE_HIGH_THRESHOLD) {
    return applyHighRpeRule(currentSetRpe, suggestedWeight, targetReps);
  }
  
  // Check for rep drop from target
  const repDropRatio = (targetReps - currentSetReps) / targetReps;
  if (repDropRatio >= REPS_DROP_THRESHOLD && currentSetReps > 0) {
    return applyRepDropRule(repDropRatio, currentSetReps, targetReps, suggestedWeight);
  }
  
  // Check for strong performance (hit target with low RPE)
  if (currentSetReps >= targetReps && currentSetRpe <= RPE_LOW_THRESHOLD) {
    return applyStrongPerformanceRule(currentSetRpe, currentSetReps, targetReps, suggestedWeight);
  }
  
  // No adjustment needed
  return {
    reason: 'first_set_baseline',
    message: 'Performance within expected range, no adjustment needed',
  };
}

// ============================================================================
// INDIVIDUAL RULES
// ============================================================================

/**
 * Rule: First set with high RPE
 */
function checkFirstSetRpe(
  rpe: number,
  suggestedWeight: number,
  targetReps: number,
): AutoregulationResult {
  if (rpe >= RPE_VERY_HIGH_THRESHOLD) {
    const adjustedWeight = Math.max(MIN_WEIGHT_KG, suggestedWeight * (1 - WEIGHT_REDUCTION_LARGE));
    return {
      adjustment: {
        weightMultiplier: 1 - WEIGHT_REDUCTION_LARGE,
        message: `First set RPE ${rpe} very high. Reducing weight 10% for remaining sets.`,
        ruleId: 'FIRST_SET_VERY_HIGH_RPE',
        confidence: 0.9,
      },
      reason: 'high_rpe',
      adjustedWeight,
      message: `First set RPE ${rpe} very high. Reducing weight 10% for remaining sets.`,
    };
  }
  
  if (rpe >= RPE_HIGH_THRESHOLD) {
    const adjustedWeight = Math.max(MIN_WEIGHT_KG, suggestedWeight * (1 - WEIGHT_REDUCTION_SMALL));
    return {
      adjustment: {
        weightMultiplier: 1 - WEIGHT_REDUCTION_SMALL,
        message: `First set RPE ${rpe} high. Reducing weight 5% for remaining sets.`,
        ruleId: 'FIRST_SET_HIGH_RPE',
        confidence: 0.85,
      },
      reason: 'high_rpe',
      adjustedWeight,
      message: `First set RPE ${rpe} high. Reducing weight 5% for remaining sets.`,
    };
  }
  
  return {
    reason: 'first_set_baseline',
    message: 'First set completed, establishing baseline',
  };
}

/**
 * Rule: Very high RPE (10) - significant reduction needed
 */
function applyVeryHighRpeRule(
  rpe: number,
  suggestedWeight: number,
  targetReps: number,
): AutoregulationResult {
  const adjustedWeight = Math.max(MIN_WEIGHT_KG, suggestedWeight * (1 - WEIGHT_REDUCTION_LARGE));
  const adjustedReps = Math.max(1, targetReps - REPS_REDUCTION_LARGE);
  
  return {
    adjustment: {
      weightMultiplier: 1 - WEIGHT_REDUCTION_LARGE,
      targetRepsDelta: -REPS_REDUCTION_LARGE,
      message: `RPE ${rpe} indicates maximal effort. Reducing weight 10% and target reps by 2.`,
      ruleId: 'VERY_HIGH_RPE_REDUCE',
      confidence: 0.95,
    },
    reason: 'high_rpe',
    adjustedWeight,
    adjustedReps,
    message: `RPE ${rpe} indicates maximal effort. Reducing weight 10% and target reps by 2.`,
  };
}

/**
 * Rule: High RPE (9) - moderate reduction
 */
function applyHighRpeRule(
  rpe: number,
  suggestedWeight: number,
  targetReps: number,
): AutoregulationResult {
  // Prefer reducing weight over reps for muscle stimulus
  const adjustedWeight = Math.max(MIN_WEIGHT_KG, suggestedWeight * (1 - WEIGHT_REDUCTION_SMALL));
  
  return {
    adjustment: {
      weightMultiplier: 1 - WEIGHT_REDUCTION_SMALL,
      message: `RPE ${rpe} is high. Reducing weight 5% for next set.`,
      ruleId: 'HIGH_RPE_REDUCE',
      confidence: 0.85,
    },
    reason: 'high_rpe',
    adjustedWeight,
    message: `RPE ${rpe} is high. Reducing weight 5% for next set.`,
  };
}

/**
 * Rule: Significant rep drop from target
 */
function applyRepDropRule(
  dropRatio: number,
  actualReps: number,
  targetReps: number,
  suggestedWeight: number,
): AutoregulationResult {
  const dropPercent = Math.round(dropRatio * 100);
  
  // If large drop, reduce both weight and target
  if (dropRatio >= 0.30) {
    const adjustedWeight = Math.max(MIN_WEIGHT_KG, suggestedWeight * (1 - WEIGHT_REDUCTION_LARGE));
    const adjustedReps = Math.max(1, targetReps - REPS_REDUCTION_SMALL);
    
    return {
      adjustment: {
        weightMultiplier: 1 - WEIGHT_REDUCTION_LARGE,
        targetRepsDelta: -REPS_REDUCTION_SMALL,
        message: `Reps dropped ${dropPercent}% (${actualReps}/${targetReps}). Reducing weight 10% and target by 1.`,
        ruleId: 'LARGE_REPS_DROP',
        confidence: 0.9,
      },
      reason: 'reps_drop',
      adjustedWeight,
      adjustedReps,
      message: `Reps dropped ${dropPercent}% (${actualReps}/${targetReps}). Reducing weight 10% and target by 1.`,
    };
  }
  
  // Moderate drop - just reduce weight
  const adjustedWeight = Math.max(MIN_WEIGHT_KG, suggestedWeight * (1 - WEIGHT_REDUCTION_SMALL));
  
  return {
    adjustment: {
      weightMultiplier: 1 - WEIGHT_REDUCTION_SMALL,
      message: `Reps dropped ${dropPercent}% (${actualReps}/${targetReps}). Reducing weight 5%.`,
      ruleId: 'REPS_DROP_ADJUST',
      confidence: 0.8,
    },
    reason: 'reps_drop',
    adjustedWeight,
    message: `Reps dropped ${dropPercent}% (${actualReps}/${targetReps}). Reducing weight 5%.`,
  };
}

/**
 * Rule: Strong performance - could suggest increase (conservative)
 */
function applyStrongPerformanceRule(
  rpe: number,
  actualReps: number,
  targetReps: number,
  suggestedWeight: number,
): AutoregulationResult {
  // Only suggest increase if significantly exceeding target with low effort
  const excessReps = actualReps - targetReps;
  
  if (excessReps >= 2 && rpe <= 6) {
    const adjustedWeight = suggestedWeight * (1 + WEIGHT_INCREASE_SMALL);
    
    return {
      adjustment: {
        weightMultiplier: 1 + WEIGHT_INCREASE_SMALL,
        message: `Strong performance: ${actualReps} reps at RPE ${rpe}. Consider +2.5% for next set.`,
        ruleId: 'STRONG_PERFORMANCE_INCREASE',
        confidence: 0.7, // Lower confidence - increase is optional
      },
      reason: 'strong_performance',
      adjustedWeight,
      message: `Strong performance: ${actualReps} reps at RPE ${rpe}. Consider +2.5% for next set.`,
    };
  }
  
  // Good performance but not enough to warrant increase
  return {
    reason: 'strong_performance',
    message: `Good performance: ${actualReps} reps at RPE ${rpe}. Keep current weight.`,
  };
}

/**
 * Rule: Accumulated fatigue across multiple sets
 */
function checkAccumulatedFatigue(
  previousSets: SetLogEntry[],
  currentRpe?: number,
): AutoregulationResult {
  // Count sets with high RPE
  const highRpeSets = previousSets.filter(s => s.rpe && s.rpe >= RPE_HIGH_THRESHOLD);
  
  // Include current set if high RPE
  const totalHighRpe = highRpeSets.length + (currentRpe && currentRpe >= RPE_HIGH_THRESHOLD ? 1 : 0);
  
  if (totalHighRpe >= FATIGUE_SETS_THRESHOLD) {
    return {
      adjustment: {
        skipRemainingSets: true,
        message: `${totalHighRpe} sets at RPE 9+. Consider ending exercise to prevent overreaching.`,
        ruleId: 'FATIGUE_ACCUMULATION',
        confidence: 0.85,
      },
      reason: 'fatigue_detected',
      message: `${totalHighRpe} sets at RPE 9+. Consider ending exercise to prevent overreaching.`,
    };
  }
  
  // Check for declining performance across sets (rising RPE pattern)
  if (previousSets.length >= 2) {
    const recentSets = previousSets.slice(-2);
    const rpeRising = recentSets.every((s, idx) => {
      if (idx === 0) return true;
      const prevRpe = recentSets[idx - 1].rpe;
      return s.rpe && prevRpe && s.rpe > prevRpe;
    });
    
    if (rpeRising && currentRpe && currentRpe >= 8) {
      return {
        adjustment: {
          weightMultiplier: 1 - WEIGHT_REDUCTION_SMALL,
          message: 'Fatigue accumulating (rising RPE pattern). Reducing weight 5%.',
          ruleId: 'RISING_RPE_FATIGUE',
          confidence: 0.75,
        },
        reason: 'fatigue_detected',
        message: 'Fatigue accumulating (rising RPE pattern). Reducing weight 5%.',
      };
    }
  }
  
  return {
    reason: 'first_set_baseline',
    message: 'No significant fatigue pattern detected',
  };
}

// ============================================================================
// SESSION-LEVEL FATIGUE DETECTION
// ============================================================================

/**
 * Detect overall session fatigue from all logged sets
 */
export function detectSessionFatigue(
  allSets: SetLogEntry[],
): {
  fatigueLevel: 'low' | 'moderate' | 'high';
  score: number; // 0-1
  shouldReduceRemaining: boolean;
  message: string;
} {
  if (allSets.length === 0) {
    return {
      fatigueLevel: 'low',
      score: 0,
      shouldReduceRemaining: false,
      message: 'No sets logged yet',
    };
  }
  
  // Calculate average RPE
  const setsWithRpe = allSets.filter(s => s.rpe !== undefined);
  const avgRpe = setsWithRpe.length > 0
    ? setsWithRpe.reduce((sum, s) => sum + (s.rpe || 0), 0) / setsWithRpe.length
    : 5;
  
  // Count high RPE sets
  const highRpeCount = setsWithRpe.filter(s => s.rpe && s.rpe >= RPE_HIGH_THRESHOLD).length;
  const highRpeRatio = setsWithRpe.length > 0 ? highRpeCount / setsWithRpe.length : 0;
  
  // Check for declining performance in recent sets
  const recentSets = allSets.slice(-5);
  let decliningPerformance = 0;
  for (let i = 1; i < recentSets.length; i++) {
    if (recentSets[i].rpe && recentSets[i - 1].rpe) {
      if (recentSets[i].rpe! > recentSets[i - 1].rpe!) {
        decliningPerformance++;
      }
    }
  }
  
  // Compute fatigue score (0-1)
  const rpeScore = Math.min(1, (avgRpe - 5) / 5); // 0 at RPE 5, 1 at RPE 10
  const highRpeScore = highRpeRatio;
  const declineScore = recentSets.length > 1 ? decliningPerformance / (recentSets.length - 1) : 0;
  
  const fatigueScore = (rpeScore * 0.4) + (highRpeScore * 0.4) + (declineScore * 0.2);
  
  let fatigueLevel: 'low' | 'moderate' | 'high';
  let shouldReduceRemaining: boolean;
  let message: string;
  
  if (fatigueScore >= 0.7) {
    fatigueLevel = 'high';
    shouldReduceRemaining = true;
    message = 'High fatigue detected. Consider reducing remaining work or ending session.';
  } else if (fatigueScore >= 0.4) {
    fatigueLevel = 'moderate';
    shouldReduceRemaining = true;
    message = 'Moderate fatigue accumulating. Autoregulation will reduce weights.';
  } else {
    fatigueLevel = 'low';
    shouldReduceRemaining = false;
    message = 'Fatigue levels normal.';
  }
  
  return {
    fatigueLevel,
    score: Math.round(fatigueScore * 100) / 100,
    shouldReduceRemaining,
    message,
  };
}

/**
 * Get suggested rest time adjustment based on RPE
 */
export function getAdjustedRestTime(
  baseRestSeconds: number,
  lastSetRpe?: number,
): {
  restSeconds: number;
  adjustment: 'normal' | 'extended' | 'shortened';
  message: string;
} {
  if (lastSetRpe === undefined) {
    return {
      restSeconds: baseRestSeconds,
      adjustment: 'normal',
      message: 'Standard rest period',
    };
  }
  
  if (lastSetRpe >= RPE_VERY_HIGH_THRESHOLD) {
    // Add 60 seconds for very high RPE
    return {
      restSeconds: baseRestSeconds + 60,
      adjustment: 'extended',
      message: `Extended rest (+60s) after RPE ${lastSetRpe} set`,
    };
  }
  
  if (lastSetRpe >= RPE_HIGH_THRESHOLD) {
    // Add 30 seconds for high RPE
    return {
      restSeconds: baseRestSeconds + 30,
      adjustment: 'extended',
      message: `Extended rest (+30s) after RPE ${lastSetRpe} set`,
    };
  }
  
  if (lastSetRpe <= 6) {
    // Slightly shorter rest for easy sets (minimum 45 seconds)
    const reduced = Math.max(45, baseRestSeconds - 15);
    if (reduced < baseRestSeconds) {
      return {
        restSeconds: reduced,
        adjustment: 'shortened',
        message: `Shortened rest (-15s) after easy RPE ${lastSetRpe} set`,
      };
    }
  }
  
  return {
    restSeconds: baseRestSeconds,
    adjustment: 'normal',
    message: 'Standard rest period',
  };
}
