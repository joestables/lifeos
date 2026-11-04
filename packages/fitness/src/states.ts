// A workout's state (GYM-007, GYM-008): its stage, and Skipped worked out —
// planned, and its day has passed (ADR-0058).

export type WorkoutStage = 'planned' | 'in_progress' | 'complete'
export type WorkoutState = WorkoutStage | 'skipped'

/** `doOn` and `today` as YYYY-MM-DD, in my home time zone. */
export function workoutState(stage: WorkoutStage, doOn: string, today: string): WorkoutState {
  return stage === 'planned' && doOn < today ? 'skipped' : stage
}

/** Motivation beforehand, as the database keeps it (1–3). */
export const MOTIVATIONS = ['low', 'okay', 'high'] as const
export type Motivation = (typeof MOTIVATIONS)[number]

export function motivationOf(value: number | null): Motivation | null {
  return value === null ? null : (MOTIVATIONS[value - 1] ?? null)
}

export function motivationValue(motivation: Motivation): number {
  return MOTIVATIONS.indexOf(motivation) + 1
}
