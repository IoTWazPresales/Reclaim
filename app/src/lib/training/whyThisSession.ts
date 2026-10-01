/**
 * Home “why this session” (N-0033).
 *
 * One sentence from facts already stored on the program: week, day label,
 * run template, and a hybrid run flag. No physiology and no new plan.
 */

export type WhyThisSessionFacts = {
  hasProgram: boolean;
  inProgress: boolean;
  completedToday: boolean;
  templateKey?: string | null;
  label?: string | null;
  weekIndex?: number | null;
  scheduledRun?: boolean;
};

type StoredPlanDay = { scheduledRun?: boolean };
type StoredPlanWeek = { weekIndex?: number; days?: Record<string, StoredPlanDay> };

export type StoredProgramPlan = { weeks?: StoredPlanWeek[] };

const PLAN_WEEKS = 4;

function sessionName(label: string | null | undefined, templateKey: string | null | undefined): string {
  const trimmed = label?.replace(/\s+/g, ' ').trim();
  if (trimmed) return trimmed;
  if (!templateKey) return 'the planned session';
  return templateKey
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function weekClause(weekIndex: number | null | undefined): string | null {
  if (typeof weekIndex !== 'number' || !Number.isInteger(weekIndex)) return null;
  if (weekIndex < 1 || weekIndex > PLAN_WEEKS) return null;
  return `Week ${weekIndex} of ${PLAN_WEEKS}`;
}

export function whyThisSessionLine(facts: WhyThisSessionFacts): string | null {
  if (facts.inProgress) return 'This session is already started.';
  if (facts.completedToday) return "Today's session is finished.";
  if (!facts.hasProgram) return null;

  const hasDay = Boolean(facts.templateKey || facts.label?.trim());
  if (!hasDay) return "No session is on today's plan.";

  const week = weekClause(facts.weekIndex);
  if (facts.templateKey === 'run') {
    return week ? `${week}. Today's plan is a run.` : "Today's plan is a run.";
  }

  const name = sessionName(facts.label, facts.templateKey);
  const planned = week ? `${week}. Today's plan is ${name}.` : `Today's plan is ${name}.`;
  if (facts.scheduledRun) return `${planned} A run is also on this day.`;
  return planned;
}

/** Hybrid runs live on the stored plan JSON, not on the program-day row. */
export function scheduledRunOnStoredPlan(
  plan: StoredProgramPlan | null | undefined,
  weekIndex: number | null | undefined,
  dayIndex: number | null | undefined,
): boolean {
  if (!plan?.weeks || weekIndex == null || dayIndex == null) return false;
  const week = plan.weeks.find((item) => item.weekIndex === weekIndex);
  if (!week?.days) return false;
  const day = week.days[dayIndex] ?? week.days[String(dayIndex)];
  return day?.scheduledRun === true;
}
